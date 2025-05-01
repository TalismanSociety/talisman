#!/bin/bash

# Navigate to the directory containing the package.json file
PACKAGE_JSON_PATH="../apps/extension/package.json"

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

# Create and push the git tag
echo "Creating and pushing git tag: $VERSION"
git tag "$VERSION" -m "$VERSION"
git push --tags