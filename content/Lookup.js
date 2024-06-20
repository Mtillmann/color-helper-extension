class Lookup {
    initialized = false;

    asciiString;
    samplingFactor;
    edgeLength;
    colors;
    lookup;
    matchCache = {};
    options = {
        deltaEThreshold: 5
    }
    map = [
        "Black",
        "Blue",
        "Light Blue",
        "Dark Blue",
        "Brown",
        "Light Brown",
        "Dark Brown",
        "Cyan",
        "Light Cyan",
        "Dark Cyan",
        "Green",
        "Light Green",
        "Dark Green",
        "Grey",
        "Light Grey",
        "Dark Grey",
        "Magenta",
        "Light Magenta",
        "Dark Magenta",
        "Orange",
        "Light Orange",
        "Dark Orange",
        "Pink",
        "Light Pink",
        "Dark Pink",
        "Purple",
        "Light Purple",
        "Dark Purple",
        "Red",
        "Light Red",
        "Dark Red",
        "Violet",
        "Light Violet",
        "Dark Violet",
        "White",
        "Yellow",
        "Light Yellow",
        "Dark Yellow",
    ];

    cache = new Map();

    async init(showShadePrefix) {

        if (this.initialized) {
            return true;
        }

        if(!showShadePrefix){
            this.map = this.map.map(m => m.replace(/(Light|Dark) /, ''));
        }

        LOG_TIMINGS && console.time('COLORHELPER::Lookup::init');

        const shadeLookupBinURL = chrome.runtime.getURL("data/shade_lookup.bin")
        const shadeLookupBin = await fetch(shadeLookupBinURL);

        const colorsURL = chrome.runtime.getURL("data/colors.json")
        const colors = await fetch(colorsURL);

        const lookupURL = chrome.runtime.getURL("data/lookup.json")
        const lookup = await fetch(lookupURL);

        this.initialized = true;
        this.asciiString = await shadeLookupBin.text();


        this.lookup = await lookup.json();
        this.colors = await colors.json();

        this.lookupFactor = 256 / this.lookup.length;
        this.samplingFactor = 4;
        this.edgeLength = 256 / this.samplingFactor;

        LOG_TIMINGS && console.timeEnd('COLORHELPER::Lookup::init');

        return true;
    }

    shade(r, g, b) {
        r = ~~(r / this.samplingFactor);
        g = ~~(g / this.samplingFactor);
        b = ~~(b / this.samplingFactor);

        const p = (r * this.edgeLength * this.edgeLength) + g * this.edgeLength + b;

        return this.map[this.asciiString[p].charCodeAt(0)]
    }

    shadeList(r, g, b, halfWidth, withScore) {
        let x,
            y,
            z, shades = {};

        for (x = -halfWidth; x <= halfWidth; x++) {
            let R = r + x * this.samplingFactor, G, B;
            if (R > 255 || R < 0) {
                continue;
            }
            for (y = -halfWidth; y <= halfWidth; y++) {
                G = g + y * this.samplingFactor;
                if (G > 255 || G < 0) {
                    continue;
                }
                for (z = -halfWidth; z <= halfWidth; z++) {
                    B = b + z * this.samplingFactor;
                    if (B > 255 || B < 0) {
                        continue;
                    }
                    let shade = this.shade(R, G, B);
                    if (!(shade in shades)) {
                        shades[shade] = 1;
                        continue;
                    }
                    shades[shade]++;
                }
            }
        }

        shades = Object.entries(shades);
        shades.sort((a, b) => b[1] - a[1])

        if (!withScore) {
            shades = shades.map(s => s[0])
        }

        return shades;
    }


    bestMatch(r, g, b, breakOnThreshold) {
        r = ~~(r);
        g = ~~(g);
        b = ~~(b);

        const key = r + '_' + g + '_' + b;
        if (key in this.matchCache) {
            return this.matchCache[key];
        }

        const R = ~~(r / this.lookupFactor);
        const G = ~~(g / this.lookupFactor);
        const B = ~~(b / this.lookupFactor);
        const L = this.lookup.length;
        const givenLAB = RGBToLAB(r, g, b);

        let colors = [];
        let shades = {};
        let fallBackColors = [];
        let filteredColors = [];

        this.getClosest(this.lookup, R, L)
            .forEach(gList => {
                this.getClosest(gList, G, L)
                    .forEach(bList => {
                        const values = this.getClosest(bList, B, L);
                        colors.push(...[].concat(...values));
                    })
            });

        for (let color of colors) {

            const actualColor = this.colors[color];
            const deltaE = DeltaE({ L: givenLAB[0], A: givenLAB[1], B: givenLAB[2] }, {
                L: actualColor.L,
                A: actualColor.A,
                B: actualColor.B
            });

            if (deltaE <= this.options.deltaEThreshold) {
                filteredColors.push({
                    ...actualColor,
                    deltaE
                });

                if (breakOnThreshold && deltaE <= breakOnThreshold) {
                    break;
                }
            } else {
                fallBackColors.push({
                    ...actualColor,
                    deltaE
                });
            }
        }

        colors = filteredColors;

        if (colors.length === 0) {
            fallBackColors.sort((a, b) => a.deltaE - b.deltaE);
            colors = [fallBackColors[0]];
        }

        for (let color of colors) {
            for (let shade of color.shade) {
                if (!(shade in shades)) {
                    shades[shade] = 0;
                }
                shades[shade]++;
            }
        }


        colors.sort((a, b) => a.deltaE - b.deltaE);
        shades = Object.entries(shades);
        shades.sort((a, b) => b[1] - a[1]);

        this.matchCache[key] = {
            matchedHex: colors[0].hex,
            givenColor: [r, g, b, givenLAB[0], givenLAB[1], givenLAB[2]],
            colors,
            shades
        };

        return this.matchCache[key];
    }

    getClosest(list, index, length) {
        return [
            list[index],
            list.slice(0, index).reverse().filter(i => i !== null)[0],
            list.slice(index + 1, length).filter(i => i !== null)[0]
        ].filter(i => i !== undefined && i !== null)
    }

    search(string, deltaEThreshold = 3) {
        const originalDeltaEThreshold = this.options.deltaEThreshold;
        this.options.deltaEThreshold = deltaEThreshold;
        const start = window.performance.now();
        const matches = {};
        for (let key in this.colors) {
            if (this.colors[key].alias.find(a => a.toLowerCase().includes(string.toLowerCase()))) {
                matches[key] = this.colors[key];
            }
        }

        let results = null;
        if (Object.keys(matches).length > 0) {
            results = [];
            for (let key in matches) {
                results.push(this.bestMatch(matches[key].r, matches[key].g, matches[key].b));
            }
        }

        this.options.deltaEThreshold = originalDeltaEThreshold;

        return {
            time: window.performance.now() - start,
            results
        }
    }

}

