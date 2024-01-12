#!/bin/bash
rm -rf dist
mkdir dist
version=$(cat manifest.json | grep -oP 'version": "\K.*(?=")')
name="dist/package-$version.zip"
zip -r $name * -x dist make-package.sh