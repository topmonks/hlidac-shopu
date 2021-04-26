#!/bin/bash

./version.sh $1
git tag "extension-$1"
