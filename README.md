# Hlídač Shopů

[![CircleCI](https://circleci.com/gh/topmonks/hlidac-shopu.svg?style=shield)](https://circleci.com/gh/topmonks/hlidac-shopu)
[![codecov](https://codecov.io/gh/topmonks/hlidac-shopu/branch/trunk/graph/badge.svg?token=nlCFOKXCHx)](https://codecov.io/gh/topmonks/hlidac-shopu)
[![CodeFactor](https://www.codefactor.io/repository/github/topmonks/hlidac-shopu/badge)](https://www.codefactor.io/repository/github/topmonks/hlidac-shopu)
[![CodeScene Code Health](https://codescene.io/projects/10253/status-badges/code-health)](https://codescene.io/projects/10253)
[![CodeScene System Mastery](https://codescene.io/projects/10253/status-badges/system-mastery)](https://codescene.io/projects/10253)

[PWA](https://www.hlidacshopu.cz/app/) a rozšíření do nejrošířenějších prohlížečů, které zobrazuje historická data cen na největších
českých a slovenských e-shopech vč. [Reálné slevy](https://www.hlidacshopu.cz/metodika/). 

---

PWA and browser extension shows historical prices for biggest czech and slovak e-commerce websites.

## Install

* [Chrome extension](https://chrome.google.com/webstore/detail/hl%C3%ADda%C4%8D-shop%C5%AF/plmlonggbfebcjelncogcnclagkmkikk?hl=cs) - also works in Edge, Brave and Opera
* [Firefox extension](https://addons.mozilla.org/en-US/firefox/addon/hl%C3%ADda%C4%8D-shop%C5%AF/)
* [Safari extension](https://apps.apple.com/us/app/hl%C3%ADda%C4%8D-shop%C5%AF/id1488295734?mt=12)
* [Progressive Web Application](https://www.hlidacshopu.cz/app/) - app installable on most platforms
* [iOS app](https://apps.apple.com/us/app/hl%C3%ADda%C4%8D-shop%C5%AF/id1488295734#?platform=iphone) - also works on iPadOS

## Development

We are using `package.json` `scripts` (run `yarn run` for a list) for project automation.

### Prerequisites

*If you only want to build the Firefox extension, it is enough to install Docker and follow the guide in the next step.*

You will need:

* Node.js 22 (we use `nvm` for Node.js version management)
* `yarn` (we use Workspaces. You can't use `npm`. Sorry)
* Firefox
* Chrome
* XCode Command Line Tools (for Safari and iOS development)
* Pulumi (for Infrastructure and backend development)
* `jq` (for Extension distribution)

We have installation scripts for Debian and macOS. See `scripts` folder for installation scripts for your system.

On debian run `bash ./scripts/install-debian-tools.sh` - this will use apt-get to install `jq`.
On macOS run `bash ./scripts/install-macos-tools.sh` - this will use homebrew to install `jq`, `nvm` and `pulumi`.

## Step by step build of Firefox extension for reviewers

Install Docker for your OS (all OSes are supported) and then execute the following command from the root of the project:

```bash
./scripts/build-firefox-extension-dockerized.sh
```

Execution of this command might take a while. Built extension will be placed in the `dist` folder.

## Building extensions

All extensions (except Safari version) will be built to `./dist` folder by calling the `npm build` script.

Firefox supports Dark and Light themes for action icons, and we are optimizing action icons for these.
Chrome doesn't support action icons theming via `manifest.json` so we use `background.js` script to
add support for themes programmatically. We are removing `background.js` script, and
its entry in manifest, in the build step with other unnecessary files.

Content script `content.js` is written in ESM, but ESM is not widely supported in content scripts.
So we use simple bundle script `yarn build:extension` to convert ESM to IIFE bundle.

### Firefox extension

To build Firefox extension run `yarn build:firefox`. It will create `extension-dist` folder
for development time and packaged extension in `./dist` folder.

### Chrome extension

To build Chrome extension run `yarn build:chrome`. It will create package in `./dist` folder.

### Safari extension

1. Run `yarn build:extension` to get latest bundle script, domains (eshops) permissions and current version for Safari
2. Distribute app by XCode: `yarn start:safari` > Product > Archive > Distribute App\*
3. Manually send new app version to Review on [Itunes Connect](https://itunesconnect.apple.com/) - you will need to be logged in as TopMonks developer (credentials in 1Password)

\* Use autosigning feature and use the TopMonks s.r.o Apple developer team account. 
If this fails with missing private key, download one named "itunes Mac App Distribution mac_app.cer"
from TopMonks 1Password.

## Updating extension version

To check the current version in `package.json`, `manifest.json` and `about.html` run

```bash
./version.sh
```

Update to new version run

```bash
./version.sh x.y.z
```

## Extension development

For seamless development experience we have `yarn watch:extension` script with incremental builds
on source files changes.

We also have convenient script `yarn start:chrome` and `yarn start:firefox` to start browsers with
an already registered extension and automatic reloading on changes.

For visual testing at scale, there is `./scripts/screenshotter.mjs`. This will run Chrome with an installed extension
and take a screenshot of embedded widget on every supported e-shop. You can find resulting pictures in `./screenshots`
folder.

## Extension release

The Release process of the extension is fully automated. To start the release process, you have to:
1. run `./version.sh` to see the current version and then bump it with `./version.sh x.y.z`
2. Commit & create tag in GitHub repository in the following format: `extension-x.y.z`, 
   where `x.y.z` is the version you set in the previous step. 


## Web www.hlidacshopu.cz development

Website has its own [Blendid](https://github.com/topmonks/blendid) configuration.
Start `www.hlidacshopu.cz` development with the following command:

```bash
op run --env-file=.env --no-masking -- yarn start:www.hlidacshopu.cz
```

### Cloudinary

Sites can automatically upload images to Cloudinary and generate Cloudinary URLs.
Cloudinary needs to be properly configured. Our Cloudinary credentials are stored in 1password team vault `Hlidac shopu`.
Use [1password CLI](https://1password.com/downloads/command-line/) to get credentials 
and set them as environment variables:

```bash
op run --env-file=.env --no-masking -- yarn build:www.hlidacshopu.cz
```

If this step is skipped, you will get the following error:

```
cloudinaryUrl Unknown cloud_name
```

You can enable Cloudinary aut-upload by setting `cloudinary: true` in `task-config.json` file. You can also configure
source and destination paths in `path-config.json` file. By default, will be uploaded everything in `cloudinary` directory.
Auto-uploader will generate `images.json` data file, that will be loaded into Nunjucks context via `collections: ["images"]`
setting in `task-config.json` file.

We have implementation of helpers to generate Cloudinary URLs. One `cloudinaryUrl` filter for Nunjucks templates
that should work in conjunction with generated `images.json`. Usage should be as follows:

```twig
<img src="{{ images["picture.png"]["public_id"] | cloudinaryUrl(width=300, height=240) }}" alt="">
```

You can use all supported transformations in JS SDK, for more details see [Cloudinary JS SDK](https://cloudinary.com/documentation/image_transformations).

## Other sources

* [Figma design sources](https://www.figma.com/file/hKLyCOXXN6LtS0NtVAbJzk/Hlidacshopu.cz?node-id=869%3A3)
* [Apify Actors sources](https://gitlab.com/apify-private-actors/hlidac-shopu/)
* [Keboola Connect](https://connection.eu-central-1.keboola.com/admin/projects/395/dashboard)

---

## Update @hlidac-shopu/lib version for actors
1. Update version @hlidac-shopu/lib in ./lib/package.json
2. Publish package to npm. Login credentials are in TopMonks 1password. 
    ```bash
    cd lib
    npm login
    npm publish --access public --tag latest
    ```
3. Update version @hlidac-shopu/lib across the project
    ```bash
    yarn up @hlidac-shopu/lib -i
    ```

© 2018-2024 TopMonks s.r.o., Apify Technologies s.r.o., Keboola Czech s.r.o. & contributors; Licensed under [EUPL-1.2](LICENSE.txt)
