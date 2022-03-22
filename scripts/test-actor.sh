#!/usr/bin/env bash

INPUT_PATH="apify_storage/key_value_stores/default/INPUT.json"

if [[ "$PWD" =~ .*/actors/.* ]]; then
  if [ ! -e "$file" ] ; then
    apify init
  fi
  \cp $INPUT_PATH $INPUT_PATH.tmp
  json="$(jq --arg type TEST '. + {type: $type}' $INPUT_PATH)"
  echo $json > $INPUT_PATH
  TEST=1 apify run -p
  \mv $INPUT_PATH.tmp $INPUT_PATH
fi
