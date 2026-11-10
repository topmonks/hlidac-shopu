#!/bin/sh
set -e

# Same major version as .nvmrc. Versioned node formulae are keg-only, so link
# it to put node on the PATH of the later build scripts.
brew install node@24
brew link --force --overwrite node@24
brew install yarn
