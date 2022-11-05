#!/usr/bin/env bash
INPUT_PATH="storage/key_value_stores/default/INPUT.json"

create_nested_file() { mkdir -p "$(dirname "$1")" && touch "$1" ; }

if [ -z "$(dirname $0)" ]; then
  echo "This script must be called from actors/* directory"
  exit 1
fi

if [ ! -f "$INPUT_PATH" ]; then
  echo "$INPUT_PATH not found, creating..."
  create_nested_file "$INPUT_PATH"
  echo '{}' > "$INPUT_PATH"
fi

\cp $INPUT_PATH $INPUT_PATH.tmp
json="$(jq --arg type TEST '. + {type: $type}' $INPUT_PATH)"
echo $json > $INPUT_PATH
TEST=1 apify run -p
\mv $INPUT_PATH.tmp $INPUT_PATH
