import * as ICONS from "../assets/icons.js";
import defaultPopupGroups from "../assets/defaultPopupGroups.js";

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

            if (group.shortcut) {

                if (item.shortcut) {
                    a.setAttribute('title', `${group.shortcut} ⟶ ${item.shortcut}`);
                } else {
                    a.setAttribute('title', group.shortcut);
                }
            }

            if (item.icon) {
                a.insertAdjacentHTML('afterbegin', ICONS[item.icon]);
            }

            if (group.name) {
                let span = document.createElement('span');
                span.classList.add('title');
                span.textContent = group.name + (item.action ? ':' : '');
                a.insertAdjacentElement('beforeend', span);
            }

            if (item.action) {


                let span = document.createElement('span');
                span.textContent = item.action;
                a.insertAdjacentElement('beforeend', span);
            }

            div.insertAdjacentElement('beforeend', a);
        }
        if (div.querySelectorAll('a').length > 0) {
            console.log('inserting')
            document.body.insertAdjacentElement('beforeend', div);
        }
    }


});
