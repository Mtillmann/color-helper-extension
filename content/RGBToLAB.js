// source : https://github.com/gka/chroma.js/tree/main/src/io/lab

const RGBToLAB = (() => {

    const LAB_CONSTANTS = {
        // Corresponds roughly to RGB brighter/darker
        Kn: 18,
    
        // D65 standard referent
        Xn: 0.950470,
        Yn: 1,
        Zn: 1.088830,
    
        t0: 0.137931034,  // 4 / 29
        t1: 0.206896552,  // 6 / 29
        t2: 0.12841855,   // 3 * t1 * t1
        t3: 0.008856452,  // t1 * t1 * t1
    };

    const rgb_xyz = (r) => {
        if ((r /= 255) <= 0.04045) return r / 12.92;
        return Math.pow((r + 0.055) / 1.055, 2.4);
    }

    const xyz_lab = (t) => {
        if (t > LAB_CONSTANTS.t3) return Math.pow(t, 1 / 3);
        return t / LAB_CONSTANTS.t2 + LAB_CONSTANTS.t0;
    }

    const rgb2xyz = (r, g, b) => {
        r = rgb_xyz(r);
        g = rgb_xyz(g);
        b = rgb_xyz(b);
        const x = xyz_lab((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / LAB_CONSTANTS.Xn);
        const y = xyz_lab((0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / LAB_CONSTANTS.Yn);
        const z = xyz_lab((0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / LAB_CONSTANTS.Zn);
        return [x, y, z];
    }

    return (r, g, b) => {

        const [x, y, z] = rgb2xyz(r, g, b);
        const l = 116 * y - 16;
        return [l < 0 ? 0 : l, 500 * (x - y), 200 * (y - z)];
    }

})()