# Hlídač Shopů

[![CircleCI](https://circleci.com/gh/topmonks/hlidac-shopu.svg?style=shield)](https://circleci.com/gh/topmonks/hlidac-shopu)
[![codecov](https://codecov.io/gh/topmonks/hlidac-shopu/branch/master/graph/badge.svg?token=nlCFOKXCHx)](https://codecov.io/gh/topmonks/hlidac-shopu)
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
* [Progressive Web Application](https://www.hlidacshopu.cz/app/)

## Development

We are using `package.json` `scripts` (run `yarn run` for a list) for project automation.

### Prerequisites

You will need:

* Node.js 14 
* Yarn
* Firefox
* Chrome
* XCode Command Line Tools (for Safari and iOS development)
* Pulumi (for Infrastructure and backend development)

See `scripts` folder for install scripts for your system.

## Step by step build of exetnsion for Mozilla reviewers

```
nvm use
yarn install
yarn build:extension
yarn build:firefox
```

## Building extensions

All extensions (except Safari version) will be build to `./dist` folder by calling the `npm build` script.

Firefox supports Dark and Light themes for action icons and we are optimising action icons for these.
Chrome doesn't support action icons theming via `manifest.json` so we use `background.js` script to
add support for themes programmatically. We are removing `background.js` script, and
it's entry in manifest, in build step with other unnecessary files.

Content script `content.js` is written in ESM, but ESM is not widely supported in content scripts.
So we use simple bundle script `yarn build:extension` to convert ESM to IIFE bundle.

### Firefox extension

To build Firefox extension run `yarn build:firefox`. It will create `extension-dist` folder
for development time and packaged extension in `./dist` folder.

### Chrome extension

To build Chrome extension run `yarn build:chrome`. It will create package in `./dist` folder.

### Safari extension

1. Run `yarn build:safari` to get latest bundle script, domains (eshops) permissions and current version for Safari
2. Distribute app by XCode: `yarn start:safari` > Product > Archive > Distribute App\*
3. Manually send new app version to Review on [Itunes Connect](https://itunesconnect.apple.com/) - you will need to be logged in as TopMonks developer (credentials in 1Password)

\* Use autosigning feature and use the TopMonks s.r.o Apple developer team account. 
If this fails with missing private key, download one named "itunes Mac App Distribution mac_app.cer"
from TopMonks 1Password.

## Updating extension version

To check current version in `package.json`, `manifest.json` and `about.html` run

```
./version.sh
```

Update to new version run

```
./version.sh x.y.z
```

## Extension development

For seamless development experience we have `yarn watch:extension` script with incremental builds
on source files changes.

We also have convenient script `yarn start:chrome` and `yarn start:firefox` to start browsers with
already registered extension and automatic reloading on changes.

For visual testing at scale, there is `./scripts/screenshotter.mjs`. This will run Chrome with installed extension
and take a screenshot of embedded widget on every supported e-shop. You can find resulting pictures in `./screenshots`
folder.

## Other sources

* [Figma design sources](https://www.figma.com/file/hKLyCOXXN6LtS0NtVAbJzk/Hlidacshopu.cz?node-id=869%3A3)
* [Apify Actors sources](https://gitlab.com/apify-private-actors/hlidac-shopu/)
* [Keboola Connect](https://connection.eu-central-1.keboola.com/admin/projects/395/dashboard)

---

© 2018-2020 TopMonks s.r.o.; Licensed under [EPL-2.0](LICENSE.txt)
