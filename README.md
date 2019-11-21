# Hlídač Shopů

Rozšíření do nejrošířenějších prohlížečů, které zobrazuje historická data cen na největších
českých e-shopech vč. Reálné slevy.

---

Extension shows historical prices for biggest czech e-commerce websites.

## Development

We are using npm scripts for project automation.

### Prerequisites

You will need:

- Node.js 10
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

To build Firefox extension run `npm run build:firefox`. It will create `extension-dist` folder
for development time and packaged extension in `/dist` folder.

### Chrome extension

To build Chrome extension run `npm run build:chrome`. It will create package in `./dist` folder.

### Safari extension

1. Get latest bundle script and domain (eshops) permissions for Safari by running `npm run bundle:osx`
2. Increase Version & Build numbers of _hlidac-shopu_ **and** _hlidac-shopu Extension_ targets in General panel Identity section (these numbers has to match)
3. Distribute app by Xcodes: `npm run open:osx` > Product > Archive > Distribute App\*
4. Manually send new app version to Review on [Itunes Connect](https://itunesconnect.apple.com/) - you will need to be logged in as TopMonks developer

\* Use autosigning feature and use the TopMonks s.r.o Apple developer team account. If this fails with missing private key, download one named "itunes Mac App Distribution mac_app.cer" from Topmonks 1Password.

---

© 2018-2019 TopMonks s.r.o.; Licensed under [EPL-2.0](LICENSE.txt)
