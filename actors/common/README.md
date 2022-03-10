Set `process.env.TEST` variable to something truthy will disable uploads to S3 and Keboola.

Set `process.env.ROLLBAR_ACCESS_TOKEN` variable to override default access token for exception handling.

AWS Credentials should be provided via `process.env.AWS_ACCESS_KEY_ID` and `process.env.AWS_SECRET_ACCESS_KEY`.

CloudFront Distribution ID for invalidation should be set via `process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID`.
