import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { createRole } from "@topmonks/pulumi-aws/lambdas/edge-role";
import * as path from "path";
import * as lambdaBuilder from "../lambda-builder";

export class AppEdgeLambda extends pulumi.ComponentResource {
  private lambda: aws.lambda.Function;

  get arn() {
    // Not using qualifiedArn here due to some bugs around sometimes returning $LATEST
    return pulumi.interpolate`${this.lambda.arn}:${this.lambda.version}`;
  }

  constructor(name: string, lambda: aws.lambda.Function) {
    super("hlidac-shopu:AppEdgeLambda", name);
    this.lambda = lambda;
  }

  static async create(name: string) {
    const role = createRole(name);
    new aws.iam.RolePolicyAttachment(`${name}-basic-execution-attachment`, {
      policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
      role
    });
    new aws.iam.RolePolicyAttachment(`${name}-dynamo-read-attachment`, {
      policyArn: aws.iam.ManagedPolicy.AmazonDynamoDBReadOnlyAccess,
      role: role
    });

    const builder = await lambdaBuilder.init();
    const buildAssets = (fileName: string) =>
      builder.buildCodeAsset(
        path.join(__dirname, "app-edge-lambda", fileName),
        true
      );

    // Some resources _must_ be put in us-east-1, such as Lambda at Edge.
    const awsUsEast1 = new aws.Provider(`${name}-us-east-1`, {
      region: "us-east-1"
    });
    const lambda = new aws.lambda.Function(
      `${name}-function`,
      {
        publish: true,
        role: role.arn,
        timeout: 5,
        handler: "index.handler",
        runtime: aws.lambda.Runtime.NodeJS14dX,
        code: buildAssets("index.mjs")
      },
      { provider: awsUsEast1 }
    );

    return {
      lambda: new AppEdgeLambda(name, lambda),
      stop() {
        builder.stop();
      }
    };
  }
}
