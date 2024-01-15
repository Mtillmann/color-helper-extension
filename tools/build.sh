#!/bin/bash
rm -rf dist
mkdir dist
version=$(cat manifest.json | grep -oP 'version": "\K.*(?=")')
#name="dist/package-$version.zip"
#zip -r $name * -x dist make-package.sh
rsync --exclude=dist --exclude=tools --exclude=.git --exclude=.gitignore --exclude=readme.md --exclude=LICENSE -r . dist/color-helper
# chrome crx - not used because zip is less hassle
# $(which google-chrome) --pack-extension=dist/color-helper
# mv dist/color-helper.crx dist/color-helper-$version.crx
# mv dist/color-helper.pem dist/color-helper-$version.pem
# chrome zip
cd dist/color-helper && zip -rq ../color-helper-$version.zip * && cd ../..
cp -a dist/color-helper dist/color-helper-chromium
# firefox
node ./tools/firefoxify.mjs
cd dist/color-helper && zip -rq ../color-helper-$version.xpi * && cd ../..
mv dist/color-helper dist/color-helper-firefox
echo "Chrome extension: dist/color-helper-$version.zip"
echo "Chrome Web Store Developer Dashboard: https://chrome.google.com/webstore/devconsole/"
echo "------"
echo "Firefox extension: dist/color-helper-$version.xpi"
echo "Firefox Add-on Developer Hub: https://addons.mozilla.org/en-US/developers/addons"
#rm -rf dist/color-helper

