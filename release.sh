#!/bin/bash

git stash
./version.sh $1
git commit -a -m "Extension version $1"
