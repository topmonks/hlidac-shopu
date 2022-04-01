import * as pulumi from "@pulumi/pulumi";
import {
  createCertificate,
  registerAutoTags,
  Website
} from "@topmonks/pulumi-aws";
import { createWebsite } from "./www.hlidacshopu.cz";
import {
  createApi,
  createDatabase,
  createDatastore
} from "./api.hlidacshopu.cz";

registerAutoTags({
  "user:Project": pulumi.getProject(),
  "user:Stack": pulumi.getStack()
});

let certificate = createCertificate("www.hlidacshopu.cz");

let db = createDatabase();
let store = createDatastore();

let api = createApi("api.hlidacshopu.cz", { stage: "v2" });
// Website.createRedirect("api2.hlidacshopu.cz", {
//   target: "https://api.hlidacshopu.cz/v2"
// });
let web = createWebsite("www.hlidacshopu.cz");

export const certificateArn = certificate;
export const apiGatewayUrl = api.apiGateway.url;
export const apiDocumentationUrl = api.openApiUrl;
export const apiUrl = api.apiDistribution.url;
export const assetsCachingLambdaArn = web.assetsCachingLambda.arn;
export const securityHeadersLambdaArn = web.securityHeadersLambda.arn;
export const websiteUrl = web.website.url;
export const websiteS3BucketUri = web.website.s3BucketUri;
export const websiteS3WebsiteUrl = web.website.s3WebsiteUrl;
export const websiteCloudFrontId = web.website.cloudFrontId;
export const nakedDomainRedirectUrl = web.nakedDomainRedirect.url;
export const nakedDomainRedirectCloudFrontId =
  web.nakedDomainRedirect.cloudFrontId;
export const allShopsTable = db.allShopsTable.name;
export const allShopsMetadataTable = db.allShopsMetadataTable.name;
export const allShopsStatsTable = db.allShopsStatsTable.name;
export const dataBucketName = store.dataBucket.bucket;
export const dataDistributionID = store.dataDistributionID;
