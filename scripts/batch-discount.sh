#!/usr/bin/env bash

splitCsv() {
    HEADER=$(head -1 $1)
    if [ -n "$2" ]; then
        CHUNK=$2
    else
        CHUNK=1000
    fi
    tail -n +2 $1 | split -l $CHUNK - $1_split_
    for i in $1_split_*; do
        cp "$i" "$i.tmp"
        (echo "$HEADER" && cat "$i.tmp") > "$i"
        rm "$i.tmp"
    done
}

echo "Hlídač shopů batch discount checker"
echo ""

if [ -z "$1" ]; then echo "No file supplied"; exit 1; fi
if [ -z "$2" ]; then echo "No token supplied"; exit 1; fi

splitCsv $1 250

for i in $1_split_*; do
  echo "Processing partial request $i"
  curl --data-binary @"$i" -H "Content-Type: text/csv" -H "Authorization: Token $2" -# https://api2.hlidacshopu.cz/batch | \
  jq -r '(map(keys) | add | unique) as $cols | map(. as $row | $cols | map($row[.])) as $rows | $cols, $rows[] | @csv' > "$i.result.csv"
done

OutFileName="$1.result.csv"                       # Fix the output name
echo "Merging partial results to $OutFileName"
i=0                                       # Reset a counter
for filename in $1*.result.csv; do
 if [ "$filename"  != "$OutFileName" ] ;      # Avoid recursion
 then
   if [[ $i -eq 0 ]] ; then
      head -1  "$filename" >   "$OutFileName" # Copy header if it is the first file
   fi
   tail -n +2  "$filename" >>  "$OutFileName" # Append from the 2nd line each file
   i=$(( $i + 1 ))                            # Increase the counter
 fi
done

echo "Cleanup"

for filename in $1_split*; do
  rm -f $filename
done
