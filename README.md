# Hlídač Shopů

Rozšíření do nejrošířenějších prohlížečů, které zobrazuje historická data cen na největších
českých e-shopech vč. Reálné slevy.

---

Extension shows historical prices for biggest czech e-commerce websites.

## Development

We are using npm scripts for project automation.

### Prerequisites

You will need:

- Node.js 14
- Firefox Developer Edition
- Chrome
- XCode Command Line Tools

## Building extensions

All extensions (except Safari version) will be build to `./dist` folder by calling the `npm build` script.

Firefox supports Dark and Light themes for action icons and we are optimising action icons for these.
Chrome doesn't support action icons theming via `manifest.json` so we use `background.js` script to
add support for themes programmatically. We are removing `background.js` script and
it's entry in manifest in build step with other unnecessary files.

### Firefox extension

To build Firefox extension run `yarn build:firefox`. It will create `extension-dist` folder
for development time and packaged extension in `./dist` folder.

### Chrome extension

To build Chrome extension run `yarn build:chrome`. It will create package in `./dist` folder.

### Safari extension

1. Run `yarn build:safari` to get latest bundle script, domains (eshops) permissions and current version for Safari
2. Distribute app by Xcodes: `yarn start:safari` > Product > Archive > Distribute App\*
3. Manually send new app version to Review on [Itunes Connect](https://itunesconnect.apple.com/) - you will need to be logged in as TopMonks developer

\* Use autosigning feature and use the TopMonks s.r.o Apple developer team account. If this fails with missing private key, download one named "itunes Mac App Distribution mac_app.cer" from Topmonks 1Password.

## Updating version

To check current version in `package.json`, `manifest.json` and `about.html` run

```
yarn version
```

Update to new version run

```
yarn version x.y.z
```

---

© 2018-2020 TopMonks s.r.o.; Licensed under [EPL-2.0](LICENSE.txt)
