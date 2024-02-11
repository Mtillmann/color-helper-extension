import { PALETTE } from "../assets/icons.js";
import * as ICONS from "../assets/icons.js";

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.setAttribute('data-bs-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

    

    const items = [
        {
            icon : ICONS.PALETTE,
            title : "Colors & Shades",
            action : "Selection",
            shortcut : "Ctrl + Shift + C"
        }
    ];

    for(let item of items){
        let a = document.createElement('a');
        a.classList.add('icon-link');
        const nodes = [];
        if(item.icon){
         
        }
        

});
