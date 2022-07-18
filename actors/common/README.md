Set `process.env.DISABLE_LINKED_DATA` variable to something truthy will disable uploads to S3.
Set `process.env.DISABLE_KEBOOLA_UPLOAD` variable to something truthy will disable uploads to Keboola.

Set `process.env.ROLLBAR_ACCESS_TOKEN` variable to override default access token for exception handling.

AWS Credentials should be provided via `process.env.AWS_ACCESS_KEY_ID` and `process.env.AWS_SECRET_ACCESS_KEY`.

CloudFront Distribution ID for invalidation should be set via `process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID`.



## Publish

Login credentials are in TopMonks 1password.

```bash
yarn npm login
yarn npm publish --access public --tag latest
```
