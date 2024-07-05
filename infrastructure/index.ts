import * as pulumi from "@pulumi/pulumi";
import { Website, createCertificate, registerAutoTags } from "@topmonks/pulumi-aws";
import { createApi, createDatabase, createDatastore, createSQSIngest } from "../api.hlidacshopu.cz";
import { createWebsite } from "../www.hlidacshopu.cz";

registerAutoTags({
  "user:Project": pulumi.getProject(),
  "user:Stack": pulumi.getStack()
});

let certificate = createCertificate("www.hlidacshopu.cz");

let db = createDatabase();
let store = createDatastore();

let api = createApi("api.hlidacshopu.cz", { stage: "v2" });
Website.createRedirect("api2.hlidacshopu.cz", {
  target: "https://api.hlidacshopu.cz/v2"
});
let web = createWebsite("www.hlidacshopu.cz");
let sqs = createSQSIngest();

export const certificateArn = certificate;
export const apiGatewayUrl = api.apiGateway.url;
export const apiDocumentationUrl = api.openApiUrl;
export const apiUrl = api.apiDistribution.url;
export const websiteUrl = web.website?.url;
export const websiteS3BucketUri = web.website?.s3BucketUri;
export const websiteS3WebsiteUrl = web.website?.s3WebsiteUrl;
export const websiteCloudFrontId = web.website?.cloudFrontId;
export const nakedDomainRedirectUrl = web.nakedDomainRedirect.url;
export const nakedDomainRedirectCloudFrontId = web.nakedDomainRedirect.cloudFrontId;
export const dataBucketName = store?.dataBucket?.bucket;
export const dataDistributionID = store?.dataDistributionID;
export const blackFridayDataTable = db.blackFridayDataTable;
export const extensionParsingDataTable = db.extensionParsingDataTable;
export const apiHitCounterDataTable = db.apiHitCounterDataTable;
export const sqsIngestQueueUrl = sqs.url;
