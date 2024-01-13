class Analyzer {
    async analyze(lookup, crops) {

        const sourceScale = crops.full.width / crops.scaled.width;
        let shades = {};

        LOG_TIMINGS && console.time('COLORHELPER::Analyzer::find shades');
        const id = crops.scaled.getContext('2d').getImageData(0, 0, crops.scaled.width, crops.scaled.height);
        const l = id.data.length / 4;
        for (let i = 0; i < l; i++) {
            const r = id.data[i * 4 + 0];
            const g = id.data[i * 4 + 1];
            const b = id.data[i * 4 + 2];

            const shade = lookup.shade(r, g, b);
            if (!(shade in shades)) {
                shades[shade] = [i];
                continue;
            }
            shades[shade].push(i);
        }
        LOG_TIMINGS && console.timeEnd('COLORHELPER::Analyzer::find shades');

        let canvases = []

        LOG_TIMINGS && console.time('COLORHELPER::Analyzer::create canvases');

        const w = Math.ceil(sourceScale);
        const h = w;

        for (let shade in shades) {

            const c = document.createElement('canvas');
            c.dataset.shade = shade;
            c.classList.add('shade');
            const context = c.getContext('2d');

            c.width = crops.full.width;
            c.height = crops.full.height;

            for (let p of shades[shade]) {
                const x = Math.ceil((p % crops.scaled.width) * sourceScale)
                const y = Math.ceil((~~(p / crops.scaled.width)) * sourceScale)
                context.drawImage(crops.full, x, y, w, h, x, y, w, h);
            }
            canvases.push(c);
        }

        if(settings.useCompatMode){
            for(let i = 0; i < canvases.length; i++){
                const image = new Image();
                await new Promise(r => image.onload = r, image.setAttribute('src', canvases[i].toDataURL()));
                image.classList.add('shade');
                image.dataset.shade = canvases[i].dataset.shade;
                canvases[i] = image;
            }
        }

        LOG_TIMINGS && console.timeEnd('COLORHELPER::Analyzer::create canvases');
        return canvases;
    }
}