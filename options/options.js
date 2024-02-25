import { ARROW_UP, ARROW_DOWN } from "../assets/icons.js";

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

    popupGroups: [],

    logTimings: false,

    useCompatMode: false,

    showShadePrefix: true,

    highlightOptionsDisabled: false,

    pauseOnClick: true,

    colorShortcut: '',
    chartShortcut: '',


    VERSION: chrome.runtime.getManifest().version
}

function renderPopupButtons() {

    const target = document.querySelector('[data-tab="popup"]');
    target.innerHTML = '';

    for (let i = 0; i < STATE.popupGroups.length; i++) {
        const group = STATE.popupGroups[i];

        target.insertAdjacentHTML('beforeend', `
        <h3>${group.name}</h3>
        <table class="table table-sm">
        <thead>
          <tr>
            <th class="w-100"></th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>

        </tbody>
      </table>
      `);

        if (group.name === 'Settings') {
            target.insertAdjacentHTML('beforeend', `
                <p class="small text-muted">If you disable the "Settings" button, you can still access the settings by right-clicking the extension icon and selecting "Options".</p>
            `);
        }

        const tbody = target.querySelectorAll('tbody')[i];

        const l = group.items.length;
        for (let j = 0; j < l; j++) {
            const item = group.items[j];
            tbody.insertAdjacentHTML('beforeend', `<tr data-group="${i}" data-index="${j}">
          <td>
          <div class="form-check">
            <input type="checkbox" class="form-check-input" ${item.show ? 'checked' : ''} data-bind-popup-property="${i},${j}" id="cb-${i}-${j}">
            <label class="form-check-label" for="cb-${i}-${j}">
                ${item.action ?? group.name}
            </label>
          </div>
          
          </td>
          
          <td class="up-cell"></td>
          <td class="down-cell"></td>
        </tr>`);

            if (l === 1) {
                continue;
            }

            const upCell = tbody.querySelectorAll('.up-cell')[j];
            const downCell = tbody.querySelectorAll('.down-cell')[j];


            if (j > 0) {
                upCell.insertAdjacentHTML('beforeend', `<a href="#" class="move-button up">${ARROW_UP}</a>`);
            }

            if (j < l - 1) {
                downCell.insertAdjacentHTML('beforeend', `<a href="#" class="move-button down">${ARROW_DOWN}</a>`);
            }

        }

    }
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
        document.querySelector(`[data-target="${currentTab}"]`).classList.remove('active', 'bg-primary-subtle');
        document.querySelector(`[data-tab="${currentTab}"]`).classList.add('d-none');
    }
    currentTab = tab;
    document.querySelector(`[data-target="${currentTab}"]`).classList.add('active', 'bg-primary-subtle');
    document.querySelector(`[data-tab="${currentTab}"]`).classList.remove('d-none');


}

document.addEventListener('DOMContentLoaded', async () => {
    document.documentElement.setAttribute('data-bs-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    const settings = await chrome.storage.sync.get();
    for (const key in settings) {
        STATE[key] = settings[key];
    }

    DEFAULTSTATE = settings.defaultState;

    renderPopupButtons();

    document.addEventListener('click', e => {

        const t = e.target.closest('.move-button');
        if (t) {
            e.preventDefault();
            const tr = t.closest('tr');
            const group = parseInt(tr.dataset.group);
            const index = parseInt(tr.dataset.index);
            const direction = t.classList.contains('up') ? -1 : 1;

            const source = STATE.popupGroups[group].items[index];
            const target = STATE.popupGroups[group].items[index + direction];

            STATE.popupGroups[group].items[index] = target;
            STATE.popupGroups[group].items[index + direction] = source;

            renderPopupButtons();
            apply();
        }
    });

    ['change', 'input'].forEach(eventName => {
        document.addEventListener(eventName, e => {
            if ('bindPopupProperty' in e.target.dataset) {
                const group = parseInt(e.target.closest('tr').dataset.group);
                const index = parseInt(e.target.closest('tr').dataset.index);
                STATE.popupGroups[group].items[index].show = e.target.checked;
                apply();
                return;
            }


            const targetType = e.target.getAttribute('type');
            const property = targetType === 'radio' ? e.target.name : e.target.dataset.bindProperty;

            if (!property) {
                return;
            }

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
        STATE.colorShortcut = commands.find((command) => command.name === 'color-helper')?.shortcut
        STATE.chartShortcut = commands.find((command) => command.name === 'chart-helper')?.shortcut
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

    if (!currentTab) {
        changeTab(document.querySelector('#verticalTabs a[data-target]').dataset.target);
    }

    document.querySelector('#verticalTabs').addEventListener('click', e => {
        e.preventDefault();
        if (e.target.dataset.target) {
            changeTab(e.target.dataset.target);
        }
    });

});
