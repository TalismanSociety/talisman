#!/usr/bin/env bash
set -euxo pipefail

rm -rf review
mkdir review
docker build . --tag talisman-builder
docker run --rm --volume "$(pwd)/review":/review talisman-builder bash -c ' \
    NODE_OPTIONS=--max_old_space_size=8192 USE_ONE_DIST_DIR=true pnpm build:extension:prod:firefox && \
    cp /talisman/apps/extension/dist/*.zip /review/ && \
    rm -rf /talisman/apps/extension/dist && \
    find /talisman/ -depth -type d -name node_modules -exec rm -rf {} \; && \
    cp -r /talisman/ /review/sources && \
    rm -f /review/sources/apps/extension/.env.local
'
cd review
zip -r source.zip ./sources/
