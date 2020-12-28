import {
  AssetsCachingLambda,
  createGoogleMxRecords,
  createTxtRecord,
  SecurityHeadersLambda,
  Website
} from "@topmonks/pulumi-aws";
import { AppEdgeLambda } from "./app-edge-lambda";
import { RootEdgeLambda } from "./root-edge-lambda";

export async function createWebsite(domain: string) {
  let assetsCachingLambda = AssetsCachingLambda.create("hlidac-shopu-caching");
  let securityHeadersLambda = SecurityHeadersLambda.create(
    "hlidac-shopu-security"
  );
  let { lambda: appLambda, ...appBuilder } = await AppEdgeLambda.create(
    "hlidac-shopu-app-lambda"
  );
  let { lambda: rootLambda, ...rootBuilder } = await RootEdgeLambda.create(
    "hlidac-shopu-root-lambda"
  );

  let gmailRecords = createGoogleMxRecords("hlidacshopu.cz");
  let googleVerification = createTxtRecord(
    "google-verification",
    "hlidacshopu.cz",
    "google-site-verification=95Q6P8PAOMniBIXaI_FgFgE4iPPjknOH8lNH9lJ88bA"
  );

  let nakedDomainRedirect = Website.createRedirect("hlidacshopu.cz", {
    target: `https://${domain}`
  });
  let website = Website.create(domain, {
    assetsCachingLambdaArn: assetsCachingLambda.arn,
    securityHeadersLambdaArn: securityHeadersLambda.arn,
    edgeLambdas: [
      {
        pathPattern: "/app/*",
        lambdaAssociation: {
          eventType: "viewer-request",
          lambdaArn: appLambda.arn
        }
      },
      {
        pathPattern: "/*",
        lambdaAssociation: {
          eventType: "viewer-request",
          lambdaArn: rootLambda.arn
        }
      }
    ]
  });

  return {
    assetsCachingLambda,
    securityHeadersLambda,
    gmailRecords,
    googleVerification,
    nakedDomainRedirect,
    website,
    stop() {
      appBuilder.stop();
      rootBuilder.stop();
    }
  };
}
