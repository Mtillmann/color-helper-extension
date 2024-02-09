const DEFAULTSTATE = {
    //this is defined in background/index.js
};

const STATE = {

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

    analyzerBackgroundMode: 'theme',
    analyzerBackground: '#888888',
    showCustomAnalyzerBackgroundPicker: false,

    logTimings: false,

    useCompatMode: false,

    showShadePrefix: true,

    highlightOptionsDisabled: false,

    pauseOnClick: true,

    shortcut: '',


    VERSION: chrome.runtime.getManifest().version
}

function apply() {
    STATE.maxPixelsFormatted = STATE.maxPixels.toLocaleString();
    STATE.highlightOptionsDisabled = !STATE.highlightColorShade;
    STATE.unmatchedOpacityFormatted = STATE.unmatchedOpacity + '%';
    STATE.unmatchedSaturationFormatted = STATE.unmatchedSaturation + '%';
    STATE.disableOutlineColor = !STATE.outlineMatched || STATE.highlightOptionsDisabled;
    STATE.disableUnmatchedOpacity = !STATE.reduceUnmatchedOpacity || STATE.highlightOptionsDisabled;
    STATE.disableUnmatchedSaturation = !STATE.desaturateUnmatched || STATE.highlightOptionsDisabled;

    STATE.showCustomAnalyzerBackgroundPicker = STATE.analyzerBackgroundMode === 'custom';

    document.querySelector(`[name="colorTheme"][value="${STATE.colorTheme}"]`).setAttribute('checked', true);

    document.querySelector(`[name="analyzerBackgroundMode"][value="${STATE.analyzerBackgroundMode}"]`).setAttribute('checked', true);
    


    document.querySelectorAll('[data-bind-property]').forEach(el => {
        const property = el.dataset.bindProperty;

        if (el.type === 'checkbox') {
            el.checked = STATE[property];
        } else {
            el.value = STATE[property];
        }
    });

    document.querySelectorAll('[data-content-property]').forEach(el => {
        el.textContent = STATE[el.dataset.contentProperty];
    });

    document.querySelectorAll('[data-disable-for-property]').forEach(el => {
        el.disabled = STATE[el.dataset.disableForProperty];
    });

    document.querySelectorAll('[data-show-for-property]').forEach(el => {
        const show = STATE[el.dataset.showForProperty];
        const className = el.dataset.displayClass ?? 'd-block';
        if(show){
            el.classList.add(className);
            el.classList.remove('d-none')
        }else{
            el.classList.add('d-none');
            el.classList.remove(className)
        }
        
    });

    store();
}

async function store(){
    const state = Object.keys(DEFAULTSTATE).reduce((all, key) => {
        all[key] = STATE[key];
        return all;
    }, {});
    await chrome.storage.sync.set(state);    
}

document.addEventListener('DOMContentLoaded', async () => {
    document.documentElement.setAttribute('data-bs-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    const settings = await chrome.storage.sync.get();
    for (const key in settings) {
        DEFAULTSTATE[key] = settings[key];
        STATE[key] = settings[key];
    }


    ['change', 'input'].forEach(eventName => {
        document.addEventListener(eventName, e => {
            const targetType = e.target.getAttribute('type');            
            const property = targetType === 'radio' ? e.target.name : e.target.dataset.bindProperty;
            const hint = e.target.dataset.typeHint;

            let value = targetType === 'checkbox' ? e.target.checked : e.target.value;

            if (hint === 'int') {
                value = parseInt(value, 10);
            }

            STATE[property] = value;
            apply();
        });
    });

    chrome.commands.getAll((commands) => {
        STATE.shortcut = commands.find((command) => command.name === 'color-helper')?.shortcut
    })

    apply();

});

document.addEventListener('_____alpine:init', () => {
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