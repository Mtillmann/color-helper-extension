import { readFileSync, writeFileSync } from 'fs';

const manifest = JSON.parse(readFileSync('./dist/color-helper/manifest.json', 'utf8'));
manifest.browser_specific_settings = {
    "gecko": {
        "id": "color-helper@mtillmann.github.io",
        "strict_min_version": "120.0"
    }
};

manifest.background.scripts = ['background/index.js'];
manifest.host_permissions = ['<all_urls>'];
manifest.options_ui = {page : manifest.options_page};



delete manifest.options_page;
delete manifest.background.service_worker;
delete manifest.update_url;


writeFileSync('./dist/color-helper/manifest.json', JSON.stringify(manifest, null, 4));