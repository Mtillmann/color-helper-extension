import * as ICONS from "../assets/icons.js";
import defaultPopupGroups from "../assets/defaultPopupGroups.js";

function inject(tab) {
    chrome.tabs.sendMessage(tab.id, { message: 'init' }, (res) => {
        if (res) {
            clearTimeout(timeout)
        }
    })
}

document.addEventListener('DOMContentLoaded', async () => {
    document.documentElement.setAttribute('data-bs-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

    let groups;

    try {
        const settings = await chrome.storage.sync.get();
        groups = settings.popupGroups;
    } catch (e) {
        groups = defaultPopupGroups;
        console.log('using default groups...');
    }


    const commands = [...await chrome.commands.getAll()].reduce((acc, command) => {
        acc[command.name] = command.shortcut;
        return acc;
    }
        , {})


    for (let group of groups) {
        let div = document.createElement('div');
        div.classList.add('btn-group-vertical', 'btn-group-sm', 'mb-2', 'w-100');
        div.textContent = group.group;


        for (let item of group.items) {
            if (!item.show) {
                continue;
            }

            let a = document.createElement('a');
            a.setAttribute('href', '#');
            a.classList.add('icon-link', 'btn', `btn-outline-${item.color ?? 'primary'}`, 'btn-sm');
            a.dataset.type = group.id;
            a.dataset.action = item.id;

            a.addEventListener('click', async (e) => {
                e.preventDefault();

                //close is never executed when called after the await below
                setTimeout(() => {
                    window.close();
                }, 500);

                const type = e.currentTarget.dataset.type;
                const action = e.currentTarget.dataset.action

                if (type === 'settings') {
                    chrome.runtime.openOptionsPage()
                    return;
                }

                await chrome.runtime.sendMessage({
                    message: 'inject', options: {
                        type, action
                    }
                })

            });

            if (group.shortcutId && commands[group.shortcutId]) {

                if (item.shortcut) {
                    a.setAttribute('title', `${commands[group.shortcutId]} ⟶ ${item.shortcut}`);
                } else {
                    a.setAttribute('title', commands[group.shortcutId]);
                }
            }

            if (item.icon) {
                a.insertAdjacentHTML('afterbegin', ICONS[item.icon]);
            }

            /*
            if (group.name) {
                let span = document.createElement('span');
                span.classList.add('title');
                span.textContent = group.name + (item.action ? ':' : '');
                a.insertAdjacentElement('beforeend', span);
            }
            */

            
                let span = document.createElement('span');
                span.textContent = item.action ?? group.name;
                a.insertAdjacentElement('beforeend', span);
            

            div.insertAdjacentElement('beforeend', a);
        }
        if (div.querySelectorAll('a').length > 0) {
            document.body.insertAdjacentElement('beforeend', div);
        }
    }


});
