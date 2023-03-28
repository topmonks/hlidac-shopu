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

  const apiHitCounterDataTable = new aws.dynamodb.Table("api_hit_counter", {
    name: "api_hit_counter",
    hashKey: "shop",
    rangeKey: "date",
    attributes: [
      { name: "shop", type: "S" },
      { name: "date", type: "S" }
      //{ name: "views", type: "N" }
    ],
    writeCapacity: 1,
    readCapacity: 1
  });

  const blackFridayDataTable = new aws.dynamodb.Table("black_friday_data", {
    name: "black_friday_data",
    hashKey: "year",
    attributes: [{ name: "year", type: "S" }],
    writeCapacity: 1,
    readCapacity: 1
  });

  return pulumi.Output.create({
    blackFridayDataTable: blackFridayDataTable.name,
    extensionParsingDataTable: extensionParsedDataTable.name,
    apiHitCounterDataTable: apiHitCounterDataTable.name
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

export function createApi(domainName: string, options?: any) {
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

  new aws.iam.RolePolicyAttachment(
    hsName("lambda-s3-read-attachment", options),
    {
      policyArn: aws.iam.ManagedPolicy.AmazonS3ReadOnlyAccess,
      role: defaultLambdaRole
    }
  );

  const buildAssets = (fileName: string) =>
    lambdaBuilder.buildCodeAsset(
      path.join(__dirname, "src", "lambda", fileName),
      true
    );

  const getRouteHandler = (
    name: string,
    fileName: string,
    role: aws.iam.Role,
    { environment, timeout = 15, memorySize = 128 }: RouteHandlerArgs
  ): aws.lambda.Function =>
    new aws.lambda.Function(hsName(`api-${name}-lambda`, options), {
      publish: true,
      runtime: "nodejs18.x",
      architectures: ["arm64"],
      role: role.arn,
      handler: "index.handler",
      code: buildAssets(fileName),
      memorySize,
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
      memorySize,
      authorizers,
      environment
    }: RouteArgs
  ): ApiRoute => ({
    type: "handler",
    handler: getRouteHandler(name, fileName, role ?? defaultLambdaRole, {
      timeout: timeout ?? 15,
      memorySize,
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
    description: "Staged API Hlídače shopů managed by Pulumi",
    cacheEnabled: true,
    cacheSize: "0.5", // GB
    routes: [
      createHandlerRoute("detail", {
        httpMethod: "GET",
        path: "/detail",
        fileName: "detail/index.mjs",
        requiredParameters: [{ in: "query", name: "url" }],
        memorySize: 512
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
      createHandlerRoute("dashboard", {
        httpMethod: "GET",
        path: "/dashboard",
        fileName: "dashboard/index.mjs",
        cache: { ttl: 3600 }
      }),
      createHandlerRoute("black-friday", {
        httpMethod: "GET",
        path: "/black-friday",
        fileName: "blackFriday/index.mjs",
        requiredParameters: [{ in: "query", name: "year" }]
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

export function createSQSIngest(options = {}) {
  const defaultLambdaRole = new aws.iam.Role(
    hsName("default-lambda-sqs-role", options),
    {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
        aws.iam.Principals.LambdaPrincipal
      )
    }
  );

  new aws.iam.RolePolicyAttachment(
    hsName("lambda-sqs-basic-execution-attachment", options),
    {
      policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
      role: defaultLambdaRole
    }
  );

  new aws.iam.RolePolicyAttachment(hsName("lambda-s3-access", options), {
    policyArn: aws.iam.ManagedPolicy.AmazonS3FullAccess,
    role: defaultLambdaRole
  });

  new aws.iam.RolePolicyAttachment(hsName("lambda-sqs-access", options), {
    policyArn: aws.iam.ManagedPolicy.AmazonSQSFullAccess,
    role: defaultLambdaRole
  });

  const buildAssets = (fileName: string) =>
    lambdaBuilder.buildCodeAsset(
      path.join(__dirname, "src", "lambda", "sqs", fileName),
      true
    );

  const defaultLambdaOpts = {
    publish: true,
    runtime: "nodejs18.x",
    architectures: ["arm64"],
    role: defaultLambdaRole.arn,
    handler: "index.handler"
  };

  const uploaderTimeout = 60;
  const ingestQueue = new aws.sqs.Queue("ingest", {
    messageRetentionSeconds: 60 * 60 * 20, // 20 hours
    visibilityTimeoutSeconds: uploaderTimeout
  });
  const uploaderLambda = new aws.lambda.Function(
    hsName(`sqs-ingest-uploader-lambda`, options),
    {
      ...defaultLambdaOpts,
      code: buildAssets("ingest-uploader/index.mjs"),
      memorySize: 128,
      timeout: uploaderTimeout
    }
  );
  ingestQueue.onEvent("upload-changed", uploaderLambda);

  const ingestBucket = new aws.s3.Bucket("ingest.hlidacshopu.cz", {
    bucket: "ingest.hlidacshopu.cz",
    acl: "private"
  });
  const extractorLambda = new aws.lambda.Function(
    hsName(`sqs-ingest-extractor-lambda`, options),
    {
      ...defaultLambdaOpts,
      code: buildAssets("ingest-extractor/index.mjs"),
      runtime: "nodejs16.x", // waiting for a new version of `unzipper`
      memorySize: 1769,
      timeout: 900,
      environment: {
        variables: {
          SQS_URL: ingestQueue.url
        }
      }
    }
  );
  ingestBucket.onObjectCreated("ingest", extractorLambda);

  return ingestQueue;
}

interface RouteHandlerArgs {
  timeout?: number;
  environment?: lambda.FunctionEnvironment;
  memorySize?: number;
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
  memorySize?: number;
}
