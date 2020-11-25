import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { lambda } from "@pulumi/aws/types/input";
import {
  LambdaAuthorizer,
  Method,
  Request,
  Response
} from "@pulumi/awsx/apigateway";
import { Parameter } from "@pulumi/awsx/apigateway/requestValidator";
import {
  Api,
  ApiRoute,
  CacheSettings,
  CustomDomainDistribution
} from "@topmonks/pulumi-aws";

import * as batch from "./src/lambda/batch";
import * as detail from "./src/lambda/detail";
import * as check from "./src/lambda/check";
import * as reviewStats from "./src/lambda/reviewStats";
import * as shopNumbers from "./src/lambda/shopNumbers";
import * as topslevy from "./src/lambda/topslevy";
import * as og from "./src/lambda/og";

const config = new pulumi.Config("hlidacshopu");

export function createDatabase() {
  const allShopsTable = aws.dynamodb.getTable({ name: "all_shops" });
  const allShopsMetadataTable = aws.dynamodb.getTable({
    name: "all_shops_metadata"
  });
  const allShopsStatsTable = aws.dynamodb.getTable({ name: "all_shops_stats" });
  const topslevyRelativeTable = aws.dynamodb.getTable({
    name: "topslevy_perc_discount_daily"
  });
  const topslevyAbsoluteTable = aws.dynamodb.getTable({
    name: "topslevy_czk_discount_daily"
  });

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
    extensionParsingDataTable: extensionParsedDataTable.name,
    topslevyAbsoluteTable,
    topslevyRelativeTable
  });
}

export function createApi(domainName: string) {
  const defaultLambdaRole = new aws.iam.Role(
    "hlidac-shopu-default-lambda-role",
    {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
        aws.iam.Principals.LambdaPrincipal
      )
    }
  );

  new aws.iam.RolePolicyAttachment(
    "hlidac-shopu-lambda-basic-execution-attachment",
    {
      policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
      role: defaultLambdaRole
    }
  );

  new aws.iam.RolePolicyAttachment(
    "hlidac-shopu-lambda-dynamo-read-attachment",
    {
      policyArn: aws.iam.ManagedPolicy.AmazonDynamoDBFullAccess,
      role: defaultLambdaRole
    }
  );

  interface RouteHandlerArgs {
    timeout?: number;
    environment?: lambda.FunctionEnvironment;
  }

  const getRouteHandler = (
    name: string,
    callback: aws.lambda.Callback<Request, Response>,
    role: aws.iam.Role,
    { timeout = 15, environment }: RouteHandlerArgs
  ): aws.lambda.Function =>
    new aws.lambda.CallbackFunction(`hlidac-shopu-api-${name}-lambda`, {
      publish: true,
      runtime: aws.lambda.Runtime.NodeJS12dX,
      environment,
      timeout, // reasonable timeout for initial request without 500
      callback,
      role
    });

  const createHandlerRoute = (
    name: string,
    {
      httpMethod,
      path,
      callback,
      role,
      requiredParameters,
      cache,
      timeout,
      authorizers,
      environment
    }: RouteArgs
  ): ApiRoute => ({
    type: "handler",
    handler: getRouteHandler(name, callback, role ?? defaultLambdaRole, {
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

  interface RouteArgs {
    httpMethod: Method;
    path: string;
    callback: aws.lambda.Callback<Request, Response>;
    role?: aws.iam.Role;
    requiredParameters?: Parameter[];
    cache?: CacheSettings;
    timeout?: number;
    authorizers?: LambdaAuthorizer[] | LambdaAuthorizer;
    environment?: lambda.FunctionEnvironment;
  }

  const api = new Api("hlidac-shopu-api", {
    stageName: "v1",
    description: "Nová verze API Hlídače managovaná přes Pulumi",
    cacheEnabled: true,
    cacheSize: "0.5", // GB
    routes: [
      createHandlerRoute("batch", {
        httpMethod: "POST",
        path: "/batch",
        callback: batch.handler,
        timeout: 300,
        environment: { variables: { "TOKEN": config.get("token") ?? "" } }
      }),
      createHandlerRoute("detail", {
        httpMethod: "GET",
        path: "/detail",
        callback: detail.handler,
        requiredParameters: [{ in: "query", name: "url" }]
      }),
      createHandlerRoute("check", {
        httpMethod: "GET",
        path: "/check",
        callback: check.handler,
        requiredParameters: [{ in: "query", name: "url" }]
      }),
      createHandlerRoute("shop-numbers", {
        httpMethod: "GET",
        path: "/shop-numbers",
        callback: shopNumbers.handler,
        cache: { ttl: 3600 }
      }),
      createHandlerRoute("reviews-stats", {
        httpMethod: "GET",
        path: "/reviews-stats",
        callback: reviewStats.handler,
        cache: { ttl: 3600 }
      }),
      createHandlerRoute("topslevy", {
        httpMethod: "GET",
        path: "/topslevy",
        callback: topslevy.handler
      }),
      createHandlerRoute("og", {
        httpMethod: "GET",
        path: "/og",
        callback: og.handler,
        timeout: 60,
        environment: {
          variables: { "TOKEN": config.get("apify-screenshotter-token") ?? "" }
        }
      })
    ]
  });

  const apiDistribution = new CustomDomainDistribution("hlidac-shopu-api", {
    gateway: api.gateway,
    domainName
  });

  return {
    apiGateway: api.gateway,
    openApiUrl: api.openApiUrl,
    apiDistribution
  };
}
