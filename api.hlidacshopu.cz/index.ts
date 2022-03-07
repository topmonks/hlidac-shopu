import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { lambda } from "@pulumi/aws/types/input";
import { LambdaAuthorizer, Method } from "@pulumi/awsx/apigateway";
import { Parameter } from "@pulumi/awsx/apigateway/requestValidator";
import {
  Api,
  ApiRoute,
  CacheSettings,
  CustomDomainDistribution,
  Website
} from "@topmonks/pulumi-aws";
import * as lambdaBuilder from "../lambda-builder";

const path = require("path");

const config = new pulumi.Config("hlidacshopu");

export function createDatabase() {
  const allShopsTable = aws.dynamodb.getTable({ name: "all_shops" });
  const allShopsMetadataTable = aws.dynamodb.getTable({
    name: "all_shops_metadata"
  });
  const allShopsStatsTable = aws.dynamodb.getTable({ name: "all_shops_stats" });

  const extensionParsedDataTable = new aws.dynamodb.Table(
    "extension_parsed_data",
    {
      name: "extension_parsed_data",
      ttl: {
        attributeName: "expirationDate",
        enabled: true
      },
      hashKey: "pkey",
      rangeKey: "date",
      attributes: [
        { name: "pkey", type: "S" },
        { name: "date", type: "S" }
      ],
      writeCapacity: 1,
      readCapacity: 1
    }
  );

  const blackFridayDataTable = new aws.dynamodb.Table("black_friday_data", {
    name: "black_friday_data",
    hashKey: "year",
    attributes: [{ name: "year", type: "S" }],
    writeCapacity: 1,
    readCapacity: 1
  });

  return pulumi.Output.create({
    allShopsTable,
    allShopsMetadataTable,
    allShopsStatsTable,
    blackFridayDataTable: blackFridayDataTable.name,
    extensionParsingDataTable: extensionParsedDataTable.name
  });
}

export function createDatastore() {
  const website = Website.create(config.get("data_bucket") ?? "", {});
  return pulumi.Output.create({
    dataBucket: website.contentBucket,
    dataDistributionID: website.cloudFrontId
  });
}

function hsName(t: string, options?: any) {
  const suffix = options?.stage ? "-" + options?.stage : "";
  return `hlidac-shopu-${t}${suffix}`;
}

export async function createApi(domainName: string, options?: any) {
  const defaultLambdaRole = new aws.iam.Role(
    hsName("default-lambda-role", options),
    {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
        aws.iam.Principals.LambdaPrincipal
      )
    }
  );

  new aws.iam.RolePolicyAttachment(
    hsName("lambda-basic-execution-attachment", options),
    {
      policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
      role: defaultLambdaRole
    }
  );

  new aws.iam.RolePolicyAttachment(
    hsName("lambda-dynamo-read-write-attachment", options),
    {
      policyArn: aws.iam.ManagedPolicy.AmazonDynamoDBFullAccess,
      role: defaultLambdaRole
    }
  );

  new aws.iam.RolePolicyAttachment(hsName("lambda-s3-read-attachment", options), {
    policyArn: aws.iam.ManagedPolicy.AmazonS3ReadOnlyAccess,
    role: defaultLambdaRole
  });

  const buildAssets = (fileName: string) =>
    lambdaBuilder.buildCodeAsset(path.join(__dirname, "src", "lambda", fileName));

  const getRouteHandler = (
    name: string,
    fileName: string,
    role: aws.iam.Role,
    { timeout = 15, environment }: RouteHandlerArgs
  ): aws.lambda.Function =>
    new aws.lambda.Function(hsName(`api-${name}-lambda`, options), {
      publish: true,
      runtime: aws.lambda.Runtime.NodeJS14dX,
      architectures: ["arm64"],
      role: role.arn,
      handler: "index.handler",
      code: buildAssets(fileName),
      timeout, // reasonable timeout for initial request without 500
      environment
    });

  const createHandlerRoute = (
    name: string,
    {
      httpMethod,
      path,
      fileName,
      role,
      requiredParameters,
      cache,
      timeout,
      authorizers,
      environment
    }: RouteArgs
  ): ApiRoute => ({
    type: "handler",
    handler: getRouteHandler(name, fileName, role ?? defaultLambdaRole, {
      timeout: timeout ?? 15,
      environment
    }),
    cors: { methods: [httpMethod, "OPTIONS"] }, // autogenerate CORS handler
    authorizers,
    requiredParameters,
    httpMethod,
    path,
    cache
  });

  const api = new Api(hsName("api", options), {
    stageName: options?.stage ?? "v1",
    description: options?.stage ? "Staged API Hlídače shopů managed by Pulumi" : "Nová verze API Hlídače managovaná přes Pulumi",
    cacheEnabled: true,
    cacheSize: "0.5", // GB
    routes: [
      createHandlerRoute("detail", {
        httpMethod: "GET",
        path: "/detail",
        fileName: options?.stage ? "detail-s3/index.mjs" : "detail/index.mjs",
        requiredParameters: [{ in: "query", name: "url" }]
      }),
      createHandlerRoute("data", {
        httpMethod: "GET",
        path: "/data",
        fileName: "data/index.mjs",
        requiredParameters: [{ in: "query", name: "url" }]
      }),
      createHandlerRoute("shop-numbers", {
        httpMethod: "GET",
        path: "/shop-numbers",
        fileName: "shopNumbers/index.mjs",
        requiredParameters: [{ in: "query", name: "year" }]
      }),
      createHandlerRoute("reviews-stats", {
        httpMethod: "GET",
        path: "/reviews-stats",
        fileName: "reviewStats/index.mjs",
        cache: { ttl: 3600 }
      }),
      createHandlerRoute("og", {
        httpMethod: "GET",
        path: "/og",
        fileName: "og/index.mjs",
        timeout: 60,
        environment: {
          variables: {
            "TOKEN": config.get("screenshotter-token") ?? "",
            "HOST": config.get("screenshotter-host") ?? ""
          }
        }
      })
    ]
  });

  const apiDistribution = new CustomDomainDistribution(
    hsName("api", options),
    {
      gateway: api.gateway,
      domainName,
      basePath: options?.stage
    },
    { dependsOn: [api] }
  );

  return {
    apiGateway: api.gateway,
    openApiUrl: api.openApiUrl,
    apiDistribution
  };
}

interface RouteHandlerArgs {
  timeout?: number;
  environment?: lambda.FunctionEnvironment;
}

interface RouteArgs {
  httpMethod: Method;
  path: string;
  fileName: string;
  role?: aws.iam.Role;
  requiredParameters?: Parameter[];
  cache?: CacheSettings;
  timeout?: number;
  authorizers?: LambdaAuthorizer[] | LambdaAuthorizer;
  environment?: lambda.FunctionEnvironment;
}
