document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.setAttribute('data-bs-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
});

document.addEventListener('alpine:init', () => {
    Alpine.data('settings', () => {

        return {

            maxPixels: 100000,
            maxPixelsFormatted: '',

            highlightColorShade: true,

            reduceUnmatchedOpacity: true,
            unmatchedOpacity: 50,
            unmatchedOpacityFormatted: '50%',
            disableUnmatchedOpacity: false,

            desaturateUnmatched: true,
            unmatchedSaturation: 50,
            unmatchedSaturationFormatted: '50%',
            disableUnmatchedSaturation: false,

            outlineMatched: true,
            outlineColor: '#000000',
            disableOutlineColor: false,

            colorTheme: 'Canvas',

            analyzerBackground: 'auto',
            showCustomAnalyzerBackgroundPicker: false,

            logTimings: false,

            useCompatMode: false,

            showShadePrefix: true,

            highlightOptionsDisabled: false,

            pauseOnClick: true,

            shortcut: '',


            VERSION: chrome.runtime.getManifest().version,

            defaultState: {
                //this is defined in background/index.js
            },

            refresh() {
                //due to CSP issues no expression can be used in the html...
                this.maxPixelsFormatted = this.maxPixels.toLocaleString();
                this.highlightOptionsDisabled = !this.highlightColorShade;
                this.unmatchedOpacityFormatted = this.unmatchedOpacity + '%';
                this.unmatchedSaturationFormatted = this.unmatchedSaturation + '%';
                this.disableOutlineColor = !this.outlineMatched || this.highlightOptionsDisabled;
                this.disableUnmatchedOpacity = !this.reduceUnmatchedOpacity || this.highlightOptionsDisabled;
                this.disableUnmatchedSaturation = !this.desaturateUnmatched || this.highlightOptionsDisabled;

                


                document.querySelector(`[name="colorTheme"][value="${this.colorTheme}"]`).setAttribute('checked', true);

                if (this.analyzerBackground === 'auto') {
                    this.showCustomAnalyzerBackgroundPicker = false;
                    document.querySelector(`[name="analyzerBackground"][value="auto"]`).setAttribute('checked', true);
                } else {
                    this.showCustomAnalyzerBackgroundPicker = true;
                    document.querySelector(`[name="analyzerBackground"][value="custom"]`).setAttribute('checked', true);
                }

            },
            async store() {
                const state = Object.keys(this.defaultState).reduce((all, key) => {
                    all[key] = this[key];
                    return all;
                }, {});
                await chrome.storage.sync.set(state);
            },
            async init() {

                const settings = await chrome.storage.sync.get();
                for (const key in settings) {
                    this[key] = settings[key];
                }

                this.$nextTick(() => {
                    this.refresh();
                });

                chrome.commands.getAll((commands) => {
                    this.shortcut = commands.find((command) => command.name === 'color-helper')?.shortcut
                })
            },
            resetSettings() {
                Object.entries(this.defaultState).forEach(([key, value]) => {
                    value = JSON.parse(JSON.stringify(value));
                    this[key] = value;

                });

                this.refresh();
                this.store();
            },
            showShortcutsPage() {
                chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
            },
            updateUnmatchedSaturation(e) {
                this.unmatchedSaturation = parseFloat(e.target.value);
                this.refresh();
                this.store();
            },
            updateUnmatchedOpacity(e) {
                this.unmatchedOpacity = parseFloat(e.target.value);
                this.refresh();
                this.store();
            },
            updateMaxPixels(e) {
                this.maxPixels = parseInt(e.target.value);
                this.refresh();
                this.store();
            },
            toggleHighlightColorShade() {
                this.highlightColorShade = !this.highlightColorShade;
                this.refresh();
                this.store();
            },
            toggleReduceUnmatchedOpacity() {
                this.reduceUnmatchedOpacity = !this.reduceUnmatchedOpacity;
                this.refresh();
                this.store();
            },
            toggleOutlineMatched() {
                this.outlineMatched = !this.outlineMatched;
                this.refresh();
                this.store();
            },
            toggleDesaturateUnmatched() {
                this.desaturateUnmatched = !this.desaturateUnmatched;
                this.refresh();
                this.store();
            },
            updateOutlineColor(e) {
                this.outlineColor = e.target.value;
                this.refresh();
                this.store();
            },
            togglePauseOnClick() {
                this.pauseOnClick = !this.pauseOnClick;
                this.store();
            },
            toggleColorTheme(e) {
                this.colorTheme = e.target.value;
                this.store();
            },
            toggleAnalyzerBackground(e) {
                this.analyzerBackground = e.target.value === 'custom' ? '#888888' : e.target.value;
                this.refresh();
                this.store();
            },
            toggleLogTimings() {
                this.logTimings = !this.logTimings;
                this.store();
            },
            toggleUseCompatMode() {
                this.useCompatMode = !this.useCompatMode;
                this.store();
            },
            toggleShowShadePrefix() {
                this.showShadePrefix = !this.showShadePrefix;
                this.store();
            },
        }
    })
})