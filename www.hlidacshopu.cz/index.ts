import {
  createGoogleMxRecords,
  createTxtRecord,
  createCacheBoostingPolicy,
  createSecurityHeadersAndPermissionsPolicy,
  CloudFront,
  Website
} from "@topmonks/pulumi-aws";
import { AppEdgeLambda } from "./app-edge-lambda";
import { RootEdgeLambda } from "./root-edge-lambda";

export function createWebsite(domain: string) {
  let { lambda: appLambda } = AppEdgeLambda.create("hlidac-shopu-app-lambda");
  let { lambda: rootLambda } = RootEdgeLambda.create(
    "hlidac-shopu-root-lambda"
  );

  let gmailRecords = createGoogleMxRecords("hlidacshopu.cz");
  let googleVerification = createTxtRecord(
    "google-verification",
    "hlidacshopu.cz",
    "google-site-verification=95Q6P8PAOMniBIXaI_FgFgE4iPPjknOH8lNH9lJ88bA"
  );

  let cacheBoostingPolicy = createCacheBoostingPolicy(domain, {
    cookiesConfig: { cookieBehavior: "none" },
    headersConfig: { headerBehavior: "none" },
    queryStringsConfig: { queryStringBehavior: "none" }
  });
  let securityHeadersPolicy = createSecurityHeadersAndPermissionsPolicy(
    domain,
    {}
  );
  let nakedDomainRedirect = Website.createRedirect("hlidacshopu.cz", {
    target: `https://${domain}`
  });
  let website = Website.create(domain, {
    assetsCachePolicyId: cacheBoostingPolicy.id,
    assetResponseHeadersPolicyId:
      CloudFront.ManagedResponseHeaderPolicy
        .CORSwithPreflightAndSecurityHeadersPolicy,
    cachePolicyId: CloudFront.ManagedCachePolicy.CachingOptimized,
    responseHeadersPolicyId: securityHeadersPolicy.id,
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
    gmailRecords,
    googleVerification,
    nakedDomainRedirect,
    website
  };
}
