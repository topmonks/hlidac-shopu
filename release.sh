#!/bin/bash

git stash
./version.sh $1
git commit -a -m "Extension version $1"
git tag -a "extension-$1" -m "Release"
