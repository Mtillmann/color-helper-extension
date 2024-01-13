#!/bin/bash
rm -rf dist
mkdir dist
version=$(cat manifest.json | grep -oP 'version": "\K.*(?=")')
#name="dist/package-$version.zip"
#zip -r $name * -x dist make-package.sh
rsync --exclude=dist  --exclude=tools --exclude=build.sh --exclude=make-package.sh --exclude=.git --exclude=.gitignore --exclude=readme.md --exclude=LICENSE -r . dist/color-helper
# chrome
$(which google-chrome) --pack-extension=dist/color-helper
mv dist/color-helper.crx dist/color-helper-$version.crx
mv dist/color-helper.pem dist/color-helper-$version.pem
# firefox
node ./tools/firefoxify.mjs
cd dist/color-helper && zip -rq ../color-helper-$version.xpi * && cd ../..
#rm -rf dist/color-helper

