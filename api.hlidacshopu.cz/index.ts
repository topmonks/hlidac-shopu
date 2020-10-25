import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Method, Response, Request } from "@pulumi/awsx/apigateway";
import { Parameter } from "@pulumi/awsx/apigateway/requestValidator";
import {
  Api,
  ApiRoute,
  CacheSettings,
  CustomDomainDistribution
} from "@topmonks/pulumi-aws";

import * as check from "./src/lambda/check";
import * as reviewStats from "./src/lambda/reviewStats";
import * as shop from "./src/lambda/shop";
import * as shopNumbers from "./src/lambda/shopNumbers";
import * as topslevy from "./src/lambda/topslevy";

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
  return pulumi.Output.create({
    allShopsTable,
    allShopsMetadataTable,
    allShopsStatsTable,
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
      policyArn: aws.iam.ManagedPolicy.AmazonDynamoDBReadOnlyAccess,
      role: defaultLambdaRole
    }
  );

  const getRouteHandler = (
    name: string,
    callback: aws.lambda.Callback<Request, Response>,
    role: aws.iam.Role
  ): aws.lambda.Function =>
    new aws.lambda.CallbackFunction(`hlidac-shopu-api-${name}-lambda`, {
      publish: true,
      runtime: aws.lambda.Runtime.NodeJS12dX,
      timeout: 15, // reasonable timeout for initial request without 500
      callback,
      role
    });

  const createHandlerRoute = (
    name: string,
    { httpMethod, path, callback, role, requiredParameters, cache }: RouteArgs
  ): ApiRoute => ({
    type: "handler",
    handler: getRouteHandler(name, callback, role ?? defaultLambdaRole),
    cors: { methods: [httpMethod, "OPTIONS"] }, // autogenerate CORS handler
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
  }

  const api = new Api("hlidac-shopu-api", {
    stageName: "v1",
    description: "Nová verze API Hlídače managovaná přes Pulumi",
    cacheEnabled: true,
    cacheSize: "0.5", // GB
    routes: [
      createHandlerRoute("check", {
        httpMethod: "GET",
        path: "/check",
        callback: check.handler,
        requiredParameters: [{ in: "query", name: "url" }]
      }),
      createHandlerRoute("shop", {
        httpMethod: "GET",
        path: "/shop",
        callback: shop.handler,
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
