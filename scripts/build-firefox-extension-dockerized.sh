#!/usr/bin/env bash

docker build . -t hlidac-shopu-devcontainer
docker run --rm -v "$(pwd)":/workdir hlidac-shopu-devcontainer bash -c "yarn install && yarn build:extension && yarn build:firefox"
