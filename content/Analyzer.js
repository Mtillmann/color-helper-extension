class Analyzer {


    extractShades(imageDataData, lookup){
        LOG_TIMINGS && console.time('COLORHELPER::Analyzer::extract Shades');
        const extractedShades = {};
        
        const l = imageDataData.length / 4;
        for (let i = 0; i < l; i++) {
            const r = imageDataData[i * 4 + 0];
            const g = imageDataData[i * 4 + 1];
            const b = imageDataData[i * 4 + 2];

            const shade = lookup.shadeByRGB(r, g, b);
            if (!(shade in extractedShades)) {
                extractedShades[shade] = [i];
                continue;
            }
            extractedShades[shade].push(i);
        }
        LOG_TIMINGS && console.timeEnd('COLORHELPER::Analyzer::extract Shades');

        return extractedShades;
    }

    buildShadeCanvases(shades, crops){
        LOG_TIMINGS && console.time('COLORHELPER::Analyzer::create canvases');
        let canvases = [];
        const sourceScale = crops.full.width / crops.scaled.width;

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
        LOG_TIMINGS && console.timeEnd('COLORHELPER::Analyzer::create canvases');
        return canvases;
    }
    
    async applyCompatMode(canvases){
        LOG_TIMINGS && console.time('COLORHELPER::Analyzer::apply compat mode');
        for(let i = 0; i < canvases.length; i++){
            const image = new Image();
            await new Promise(r => image.onload = r, image.setAttribute('src', canvases[i].toDataURL()));
            image.classList.add('shade');
            image.dataset.shade = canvases[i].dataset.shade;
            canvases[i] = image;
        }
        LOG_TIMINGS && console.timeEnd('COLORHELPER::Analyzer::apply compat mode');
    }

    /**
     * analyze the image and return an array of canvases
     * 
     * @param  {} lookup 
     * @param {*} crops 
     * @returns HTMLCanvasElement[]
     */
    async analyze(lookup, crops) {

        const imageData = crops.scaled.getContext('2d').getImageData(0, 0, crops.scaled.width, crops.scaled.height);
        let shades = this.extractShades(imageData.data, lookup);
        
        const canvases = this.buildShadeCanvases(shades, crops);

        if(settings.useCompatMode){
            await this.applyCompatMode(canvases);
        }
        
        return canvases;
    }

}