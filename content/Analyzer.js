class Analyzer {


    extractShades(imageDataData, lookup){
        LOG_TIMINGS && console.time('COLORHELPER::Analyzer::extract Shades');
        const extractedShades = {};
        
        const l = imageDataData.length / 4;
        for (let i = 0; i < l; i++) {
            const r = imageDataData[i * 4 + 0];
            const g = imageDataData[i * 4 + 1];
            const b = imageDataData[i * 4 + 2];

            const shade = lookup.shade(r, g, b);
            if (!(shade in extractedShades)) {
                extractedShades[shade] = [i];
                continue;
            }
            extractedShades[shade].push(i);
        }
        LOG_TIMINGS && console.timeEnd('COLORHELPER::Analyzer::extract Shades');

        return extractedShades;
    }

    extractColors(imageDataData, lookup){
        LOG_TIMINGS && console.time('COLORHELPER::Analyzer::extract Colors');
        let extractedColors = {};
        
        const downSampleFactor = 4;
        const halfSampleFactor = downSampleFactor / 2;

        const l = imageDataData.length / 4;
        for (let i = 0; i < l; i++) {
            

            const r = (imageDataData[i * 4 + 0] >> halfSampleFactor) << halfSampleFactor;
            const g = (imageDataData[i * 4 + 1] >> halfSampleFactor) << halfSampleFactor;
            const b = (imageDataData[i * 4 + 2] >> halfSampleFactor) << halfSampleFactor;
    
            
            const color = lookup.bestMatch(r, g, b).colors[0].alias[0];            
            if (!(color in extractedColors)) {
                extractedColors[color] = [i];
                continue;
            }
            extractedColors[color].push(i);
        }
        LOG_TIMINGS && console.timeEnd('COLORHELPER::Analyzer::extract Colors');

        const cutoff = l * 0.01;

        extractedColors = Object.entries(extractedColors).reduce((acc, entry) => {
            if(entry[1].length > cutoff){
                acc[entry[0]] = entry[1];
            }
            return acc;
        }, {});

        
        return extractedColors;
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

    buildColorCanvases(colors, crops){
        LOG_TIMINGS && console.time('COLORHELPER::Analyzer::create canvases');
        let canvases = [];
        const sourceScale = crops.full.width / crops.scaled.width;

        const w = Math.ceil(sourceScale);
        const h = w;

        for (let color in colors) {

            const c = document.createElement('canvas');
            c.dataset.shade = color;
            c.classList.add('shade');
            const context = c.getContext('2d');

            c.width = crops.full.width;
            c.height = crops.full.height;

            console.log(colors[color].length);

            for (let p of colors[color]) {
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

    async analyzeChart(lookup, crops) {

        const imageData = crops.scaled.getContext('2d').getImageData(0, 0, crops.scaled.width, crops.scaled.height);
        let colors = this.extractColors(imageData.data, lookup);
        
    console.log(colors);

        const canvases = this.buildColorCanvases(colors, crops);

        if(settings.useCompatMode){
            await this.applyCompatMode(canvases);
        }
        
        canvases.forEach(c => {
            const x = c.cloneNode();
            x.style.backgroundColor = 'blue';
            document.body.appendChild(x);
        });


        return canvases;

    }
}