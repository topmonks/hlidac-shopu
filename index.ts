import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import {
  Website,
  createCertificate,
  createTxtRecord,
  createGoogleMxRecords,
  registerAutoTags,
  SecurityHeadersLambda,
  AssetsCachingLambda
} from "@topmonks/pulumi-aws";

registerAutoTags({
  "user:Project": pulumi.getProject(),
  "user:Stack": pulumi.getStack()
});

let certificate = createCertificate("www.hlidacshopu.cz");
let securityHeadersLambda = SecurityHeadersLambda.create(
  "hlidac-shopu-security"
);
let assetsCachingLambda = AssetsCachingLambda.create("hlidac-shopu-caching");
let googleVerification = createTxtRecord(
  "google-verification",
  "hlidacshopu.cz",
  "google-site-verification=95Q6P8PAOMniBIXaI_FgFgE4iPPjknOH8lNH9lJ88bA"
);
let gmailRecords = createGoogleMxRecords("hlidacshopu.cz");

let website = Website.create("www.hlidacshopu.cz", {
  assetsCachingLambdaArn: assetsCachingLambda.arn,
  securityHeadersLambdaArn: securityHeadersLambda.arn
});
let nakedDomainRedirect = Website.createRedirect("hlidacshopu.cz", {
  target: "https://www.hlidacshopu.cz"
});

export const certificateArn = certificate;
export const assetsCachingLambdaArn = assetsCachingLambda.arn;
export const securityHeadersLambdaArn = securityHeadersLambda.arn;
export const websiteUrl = website.url;
export const websiteS3BucketUri = website.s3BucketUri;
export const websiteS3WebsiteUrl = website.s3WebsiteUrl;
export const websiteCloudFrontId = website.cloudFrontId;
export const nakedDomainRedirectUrl = nakedDomainRedirect.url;
export const nakedDomainRedirectCloudFrontId = nakedDomainRedirect.cloudFrontId;
