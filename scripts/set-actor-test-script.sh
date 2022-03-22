#!/usr/bin/env bash


SCRIPT_VALUE=$1

if [ -z "$SCRIPT_VALUE" ]; then
  echo "Missing script value"
  exit 1
fi

for file in $(find actors/* -name package.json -maxdepth 1); do

  if [[ $file == "actors/common/package.json" || $file == "actors/uploader/package.json" ]]; then
    echo "Skipping $file"
    continue
  else
    echo "Setting test script for $file"
  fi
  json="$(jq --arg value "$SCRIPT_VALUE" '.scripts += {test: $value}' $file)"
  echo $json | jq '.' > $file
done