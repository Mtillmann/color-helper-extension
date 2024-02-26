# Color Helper Extension

Install: [Chrome, Edge*, Opera*, Brave, Vivaldi and other Chromium-based Browser](https://chromewebstore.google.com/detail/color-helper/lppofdjcegodcddmccmnicgfmblkdpbj) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/color-helper/)

![Color Helper Extension](./icons/128x128.png)

Assistive browser extension for people with color vision deficiency that can screenshot the current viewport or a selected area and lets you inspect the shades and approximate color names of the pixels.

## Features

- 100% free and open source
- Highly customizable
- All processing is done locally
- Free of tracking, analytics or ads
- Does not break websites

## Usage

### (Optional) Pin the extension to the toolbar

If you want to use the extension icon to launch the picker, click the extensions icon (puzzle piece) in the toolbar, then pin the Color Helper Extension.

### Analyze a selected area

1. Click the extension icon or press `ALT + C` (`⌥ + C` on macOS)
2. Select an area on the website you want to analyze
3. Hover over the pixels to see the color name and shade

### Analyze the current viewport

1. Click the extension icon or press `ALT + C` (`⌥ + C` on macOS)
2. Press `space` to take a screenshot of the current viewport
3. Hover over the pixels to see the color name and shade

### Show the options page

Chromium: Right click the extension icon and select `Options`  
Firefox: Navigate to `about:addons` and find the extension in the list, then click `Preferences`

## Changelog

### 0.0.6

- rebuild the options dialog page
- added popup to select either selection, dom or viewport mode
- added floating-ui to handle viewport edges
- added copy buttons and hex values to the floating info window
- make DeltaE display optional
- optionally show ginifab shades
- improved firefox compatibility

### 0.0.5

- Firefox Permissions request MV3 fix
- style fixes

### 0.0.4

- Add option to toggle more verbose color shade names and detection

### 0.0.3

- Fix [#1](https://github.com/Mtillmann/color-helper-extension/issues/1): compatibility mode for certain situations where canvas elements are not treated right by chromium
- Firefox support

### 0.0.2

- Fix: aggressively reset selection overlay styles to prevent issues with sites like wikipedia
- Improvement: more consistent hover and pause behavior

### 0.0.1

- Initial release

## Acknowledgements

App Icon by some random GPT-4 bot

Core extension code loosely based on [Simeon Velichkov' great screenshot-capture](https://github.com/simov/screenshot-capture)

Color names, shades and lookup code from my own project [isit.red](https://isit.red)

Firefox support mainly hinged on [hans_squared's effort](https://discourse.mozilla.org/t/browser-tabs-capturevisibletab-not-working-in-firefox-for-mv3/122965/3)

---


\* Some browsers will complain about the extension being "unverified" and "unsafe" when installing it from the Chrome Web Store instead of their first-party web stores. Since the extension is reviewed by Google, it is safe to install. 

Alternatively, you can clone the repository, review the code and install the extension manually in developer mode ✌️
