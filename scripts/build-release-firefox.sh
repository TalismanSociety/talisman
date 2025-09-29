#!/bin/bash

# Navigate to the directory containing the package.json file
PACKAGE_JSON_PATH="./apps/extension/package.json"

# Check if the package.json file exists
if [[ ! -f "$PACKAGE_JSON_PATH" ]]; then
    echo "Error: $PACKAGE_JSON_PATH not found."
    exit 1
fi

# Extract the version number from package.json using sed
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$PACKAGE_JSON_PATH")

# Check if the version was successfully extracted
if [[ -z "$VERSION" ]]; then
    echo "Error: Unable to extract version from $PACKAGE_JSON_PATH."
    exit 1
fi

# Prefix the version with 'v'
VERSION="v$VERSION"
echo "Building Firefox release version: $VERSION"

OUTPUT_NAME="talisman_extension_${VERSION}_firefox"

# cleanup and save source files in a zip before installing

rm -rf ./review
mkdir ./review
cp -r ./ ./review/sources
(cd review/sources && pnpm clean) 
(cd review && zip -qq -rm $OUTPUT_NAME.sources.zip sources) 

# install and build
pnpm install --frozen-lockfile
pnpm build:extension:prod:firefox

# zip the build
echo "Copying $OUTPUT_NAME.zip to review folder" 
cp ./apps/extension/dist/firefox/$OUTPUT_NAME.zip ./review/$OUTPUT_NAME.zip