#!/bin/bash

package_json_ver=`jq -r '.version' package.json`
manifest_ver=`jq -r '.version' extension/manifest.json`
about_ver=`cat extension/popup/about.html | perl -n -e'/<small>(\d+\.\d+\.\d+)<\/small>/ && print $1'`

echo "package.json $package_json_ver"
echo "manifest.json $manifest_ver"
echo "about.html $about_ver"

if [ "$FORCE" != "1" ]; then
  if [ "$package_json_ver" != "$manifest_ver" ] ||  [ "$manifest_ver" != "$about_ver" ]; then
    echo "version mismatch; pls fix"
    exit 1
  fi
fi

new_ver=$1
if [ ! -e $new_ver ]; then
  echo

  echo "updating to $new_ver"
  tmp=`mktemp`
  jq ".version = \"$new_ver\"" package.json > $tmp
  mv $tmp package.json

  tmp=`mktemp`
  jq ".version = \"$new_ver\"" extension/manifest.json > $tmp
  mv $tmp extension/manifest.json

  tmp=`mktemp`
  sed -E "s/<small>[0-9]+\.[0-9]+\.[0-9]+<\/small>/<small>$new_ver<\/small>/" extension/popup/about.html > $tmp
  mv $tmp extension/popup/about.html

  echo "Version updated to $new_ver"
fi

