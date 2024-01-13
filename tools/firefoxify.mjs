import { readFileSync, writeFileSync } from 'fs';

const manifest = JSON.parse(readFileSync('./dist/color-helper/manifest.json', 'utf8'));
manifest.browser_specific_settings = {
    "gecko": {
        "id": "addon@example.com",
        "strict_min_version": "42.0"
    }
};


manifest.background.scripts = ['background/index.js'];
delete manifest.background.service_worker;
delete manifest.update_url;


writeFileSync('./dist/color-helper/manifest.json', JSON.stringify(manifest, null, 4));