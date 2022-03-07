import * as pulumi from "@pulumi/pulumi";
import { createCertificate, registerAutoTags } from "@topmonks/pulumi-aws";
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

let api = createApi("api2.hlidacshopu.cz");
//let _api = createApi("api.hlidacshopu.cz", {stage: "v2"});
let web = createWebsite("www.hlidacshopu.cz");

export const certificateArn = certificate;
export const apiGatewayUrl = api.then(({ apiGateway }) => apiGateway.url);
export const apiDocumentationUrl = api.then(({ openApiUrl }) => openApiUrl);
export const apiUrl = api.then(({ apiDistribution }) => apiDistribution.url);
export const assetsCachingLambdaArn = web.then(
  ({ assetsCachingLambda }) => assetsCachingLambda.arn
);
export const securityHeadersLambdaArn = web.then(
  ({ securityHeadersLambda }) => securityHeadersLambda.arn
);
export const websiteUrl = web.then(({ website }) => website.url);
export const websiteS3BucketUri = web.then(
  ({ website }) => website.s3BucketUri
);
export const websiteS3WebsiteUrl = web.then(
  ({ website }) => website.s3WebsiteUrl
);
export const websiteCloudFrontId = web.then(
  ({ website }) => website.cloudFrontId
);
export const nakedDomainRedirectUrl = web.then(
  ({ nakedDomainRedirect }) => nakedDomainRedirect.url
);
export const nakedDomainRedirectCloudFrontId = web.then(
  ({ nakedDomainRedirect }) => nakedDomainRedirect.cloudFrontId
);
export const allShopsTable = db.allShopsTable.name;
export const allShopsMetadataTable = db.allShopsMetadataTable.name;
export const allShopsStatsTable = db.allShopsStatsTable.name;
export const dataBucketName = store.dataBucket.bucket;
export const dataDistributionID = store.dataDistributionID;
