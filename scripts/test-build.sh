#!/bin/bash
# Publish a pre-release test build of the extension, so fixes are tested
# before they go to the stores (#3639).
#
# Usage: scripts/test-build.sh <issue> [<issue>...]
#
# Builds the Chrome extension from the pushed HEAD, stamps a build ID into it,
# publishes it as the GitHub pre-release "test-build" (replacing the previous
# one, so the link never changes) and comments on the issues in the batch.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ $# -eq 0 ]; then
  echo "Usage: $0 <issue> [<issue>...]" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Commit or stash your changes first, so the build matches a commit." >&2
  exit 1
fi

git fetch --quiet origin
sha=$(git rev-parse HEAD)
if [ -z "$(git branch -r --contains "$sha")" ]; then
  echo "Push $sha first, so the build matches a published commit." >&2
  exit 1
fi

tag=test-build
asset=hlidac-shopu-test.zip
build_id="$(date +%Y-%m-%d)-$(git rev-parse --short HEAD)"
version=$(jq -r '.version' extension/manifest.json)
version_name="$version test $build_id"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

yarn build:extension
cp -R extension "$work/extension"

# chrome://extensions shows version_name; the numeric version stays unchanged.
jq --arg v "$version_name" '.version_name = $v' extension/manifest.json > "$work/extension/manifest.json"
# The widget's about page shows the version too.
perl -pi -e "s|<small>\Q$version\E</small>|<small>$version_name</small>|" "$work/extension/popup/about.html"

# Same ignore rules as the store build (web-ext-config.mjs).
yarn web-ext build --source-dir "$work/extension" --artifacts-dir "$work" --filename "$asset" --overwrite-dest

issues=""
for issue in "$@"; do
  issues+="- #$issue $(gh issue view "$issue" --json title --jq .title)"$'\n'
done

notes="Test build **$build_id** of the browser extension, built from $sha. This is not a store release.

## What to test
$issues
## Install in Chrome
1. Download **$asset** below and unzip it.
2. Open \`chrome://extensions\`, turn on **Developer mode**, click **Load unpacked** and pick the unzipped folder. If an older test build is installed, remove it first.
3. Turn off the store version of Hlídač shopů while testing, otherwise pages show two widgets.
4. The extension card shows version **$version_name**. Please mention the build ID when you report results."

gh release delete "$tag" --cleanup-tag --yes 2>/dev/null || true
git tag -d "$tag" >/dev/null 2>&1 || true
gh release create "$tag" "$work/$asset" --prerelease --target "$sha" \
  --title "Extension test build $build_id" --notes "$notes"
url=$(gh release view "$tag" --json url --jq .url)

# Commits since the last release that mention the issue, so testers see what changed.
range=HEAD
if git rev-parse -q --verify "extension-$version" >/dev/null; then range="extension-$version..HEAD"; fi

for issue in "$@"; do
  assignees=$(gh issue view "$issue" --json assignees --jq '[.assignees[].login | "@" + .] | join(" ")')
  fixes=$(git log --format='- %h %s' -E --grep="#$issue([^0-9]|$)" "$range")
  gh issue comment "$issue" --body "${assignees:+$assignees }Ready for testing in test build **$build_id** (not in the stores yet): $url

$fixes"
  gh issue edit "$issue" --add-label "ready for testing" >/dev/null
done

echo "Published $url"
