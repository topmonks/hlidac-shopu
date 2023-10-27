Set `process.env.DISABLE_KEBOOLA_UPLOAD` variable to something truthy will disable uploads to Keboola.

Set `process.env.ROLLBAR_ACCESS_TOKEN` variable to override default access token for exception handling.


## Publish

Login credentials are in TopMonks 1password.

```bash
yarn npm login
yarn npm publish --access public --tag latest
```
