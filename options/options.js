let DEFAULTSTATE = {
    //this is defined in background/index.js
};

let currentTab = null;

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
        if (show) {
            el.classList.add(className);
            el.classList.remove('d-none')
        } else {
            el.classList.add('d-none');
            el.classList.remove(className)
        }

    });

    store();
}

async function store() {
    const state = Object.keys(DEFAULTSTATE).reduce((all, key) => {
        all[key] = STATE[key];
        return all;
    }, {});
    await chrome.storage.sync.set(state);
}

function changeTab(tab) {
    if (currentTab) {
        document.querySelector(`[data-target="${currentTab}"]`).classList.remove('active','bg-primary-subtle');
        document.querySelector(`[data-tab="${currentTab}"]`).classList.add('d-none');
    }
    currentTab = tab;
    document.querySelector(`[data-target="${currentTab}"]`).classList.add('active','bg-primary-subtle');
    document.querySelector(`[data-tab="${currentTab}"]`).classList.remove('d-none');


}

document.addEventListener('DOMContentLoaded', async () => {
    document.documentElement.setAttribute('data-bs-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    const settings = await chrome.storage.sync.get();
    for (const key in settings) {
        STATE[key] = settings[key];
    }

    DEFAULTSTATE = settings.defaultState;


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
        apply();
    })

    apply();

    document.querySelector('#changeShortCuts').addEventListener('click', e => {
        e.preventDefault();
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    })

    document.querySelector('#resetSettings').addEventListener('click', e => {
        e.preventDefault();
        Object.entries(DEFAULTSTATE).forEach(([key, value]) => {
            value = JSON.parse(JSON.stringify(value));
            STATE[key] = value;

        });

        apply();
    })

    if(!currentTab){
        changeTab(document.querySelector('#verticalTabs a[data-target="popup"]').dataset.target);
    }

    document.querySelector('#verticalTabs').addEventListener('click', e => {
        e.preventDefault();
        if (e.target.dataset.target) {
            changeTab(e.target.dataset.target);
        }
    });

});
