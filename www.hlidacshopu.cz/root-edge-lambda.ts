import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { createRole } from "@topmonks/pulumi-aws/lambdas/edge-role";
import * as path from "path";

export class RootEdgeLambda extends pulumi.ComponentResource {
  private lambda: aws.lambda.Function;

  get arn() {
    // Not using qualifiedArn here due to some bugs around sometimes returning $LATEST
    return pulumi.interpolate`${this.lambda.arn}:${this.lambda.version}`;
  }

  constructor(name: string, lambda: aws.lambda.Function) {
    super("hlidac-shopu:RootEdgeLambda", name);
    this.lambda = lambda;
  }

  static create(name: string) {
    const role = createRole(name);
    new aws.iam.RolePolicyAttachment(`${name}-basic-execution-attachment`, {
      policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
      role
    });

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
        runtime: aws.lambda.Runtime.NodeJS12dX,
        code: new pulumi.asset.AssetArchive({
          ".": new pulumi.asset.FileArchive(
            path.resolve(__dirname, "./root-edge-lambda")
          )
        })
      },
      { provider: awsUsEast1 }
    );

    return new RootEdgeLambda(name, lambda);
  }
}
