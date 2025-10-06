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
echo "Checking Firefox release version: $VERSION"

OUTPUT_NAME="talisman_extension_${VERSION}_firefox"


# unzip and build sources
cd review
echo "step: rebuild in a new folder"
unzip -qq $OUTPUT_NAME.sources.zip -d "$OUTPUT_NAME.sources"
(cd "./$OUTPUT_NAME.sources/sources" && pnpm install --frozen-lockfile && pnpm build:extension:prod:firefox)

echo "step: unzip initial build content"
unzip -qq $OUTPUT_NAME.zip -d $OUTPUT_NAME
echo "step: unzip new build content"
unzip -qq ./$OUTPUT_NAME.sources/sources/apps/extension/dist/firefox/$OUTPUT_NAME.zip -d ./check-build.unzipped

# compare both: if anything is output, the builds differ
echo "step: compare build contents"
diff -qr ./$OUTPUT_NAME ./check-build.unzipped