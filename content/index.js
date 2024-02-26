
let settings;
let LOG_TIMINGS = false;
let CHARTDOWNSAMPLE = 1;
let selectionOverlay = null;
let SELECTION = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
};
let ANALYZE_OPTIONS = {
  action: 'selection'
};
let SELECTION_START = {
  x: 0,
  y: 0,
};

//firefox has no window object in content scripts
const $FloatingUIDOM = window?.FloatingUIDOM ?? globalThis?.FloatingUIDOM;

//SVG icons are apparently not rendered in chrome...
const copyIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAIFJREFUSIntlWEKgCAMRp9dIzpQHcST7x7rT0EMyY2av/xABJ174xvMoqpkaknN7gAcgADqWALsNkHpWCTAGihYgC0CuC+LI3kzdngPbj/TAL9rAiZgAvoAuXbPNH3GuwG19eilmGoP7TSNTE+Xhvcg4rlr8lpAxHOXej/aZ6X34AQO5Tvj/Jzy8QAAAABJRU5ErkJggg==';

const lookup = new Lookup();

function componentToHex(c) {
  const hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function applySelection(x, y, w, h) {
  SELECTION.x = x;
  SELECTION.y = y;
  SELECTION.w = w;
  SELECTION.h = h;

  selectionOverlay.style.setProperty('--x', SELECTION.x + 'px');
  selectionOverlay.style.setProperty('--y', SELECTION.y + 'px');
  selectionOverlay.style.setProperty('--w', SELECTION.w + 'px');
  selectionOverlay.style.setProperty('--h', SELECTION.h + 'px');
}

function template() {

  const classes = ['loading'];
  const styles = [
    `--w: ${SELECTION.w}px`,
    `--h: ${SELECTION.h}px`,
    `--x: ${SELECTION.x}px`,
    `--y: ${SELECTION.y}px`,
  ];


  if (settings.highlightColorShade) {
    classes.push('highlight-color-shade');
  }

  if (settings.reduceUnmatchedOpacity) {
    classes.push('reduce-unmatched-opacity');
    styles.push(`--unmatched-opacity: ${settings.unmatchedOpacity / 100}`);
  }

  if (settings.desaturateUnmatched) {
    classes.push('desaturate-unmatched');
    styles.push(`--unmatched-saturation: saturate(${settings.unmatchedSaturation}%)`);
  }

  if (settings.outlineMatched) {
    classes.push('outline-matched');
    styles.push(`--outline-color: ${settings.outlineColor}`);
  }

  if (settings.pauseOnClick) {
    classes.push('pause-on-click');
  }

  if (settings.analyzerBackgroundMode !== 'theme') {
    classes.push('use-custom-analyzer-background');
    styles.push(`--analyzer-background: ${settings.analyzerBackground}`);
  }

  return `
<div id="colorHelperBrowserExtensionInspectionOverlay"
  data-random="${Math.random().toString(36).substring(2)}"
  class="${classes.join(' ')}"
  style="${styles.join('; ')}"
>
  <div class="tooltip" style="--copy-icon:url(${copyIcon})">
    <table>
      <tbody>
        <tr class="underline">
          <td class="shade-cell">
            <small>Color Shade</small>
            <h2><strong class="shade-name"></strong></h2>

            <small class="opacity-75">
              <span class="alt-shade-name"></span>
            </small>
          </td>
          <td class="name-cell">
            <small>Color Name</small>
            <h2 class="color-name"></h2>
            
            <small class="opacity-75">
              <span class="quality"></span>
              (&Delta;E=<span class="delta-e"></span>)
            </small>
            
          </td>
        </tr>
      </tbody>
    </table>
    <table>
      <tbody>
        
        <tr class="underline">
          <td class="label">RGB</td>
          <td><span class="color-rgb"></span></td>
          <td class="has-copy-button"><a href="#" class="copy-button">copy</a></td>
        </tr>
        <tr class="underline">
          <td class="label">HEX</td>
          <td><span class="color-hex"></span></td>
          <td class="has-copy-button">
            <a href="#" class="copy-button">
              copy
            </a>
          </td>
        </tr>
        <tr class="hint">
          <td colspan="3">
            <small>Click to lock/unlock floating info</small>
          </td>
        </tr>
      </tbody>

    </table>
  </div>

  <div class="loading-spinner">
  </div>
  <div class="target"></div>
</div>
`
}

const permissionErrorMessage = `  
<div id="colorHelperBrowserExtensionPermissionError">  
  <div class="error">
    <h1><strong>color helper: Permission Error</strong></h1>
    <p>
      You need to grant the extension permission to "access your data for all websites".
    </p>
    <p>
      Click the extension button once, then confirm the dialog or 
      go to <code>about:addons</code>, click on "color helper", click on "Permissions" and grant the permission.
    </p>
    <p>
      Sorry for the inconvenience, but this is the only way to get the permission in Firefox.
    </p>
  </div>
</div>
`;


async function showAnalysis(crops) {

  const html = template();
  document.body.insertAdjacentHTML('beforeend', html);

  //hide the overlay late to avoid interaction during capture
  hideOverlay(true);

  //without this line the whole loading spinner and backdrop filter
  //will only work ONCE per page load... no idea why
  await new Promise(r => { setTimeout(r, 33) });

  const overlay = document.getElementById('colorHelperBrowserExtensionInspectionOverlay');

  const target = overlay.querySelector('.target');

  if (settings.useCompatMode) {
    overlay.classList.add('uses-compat-mode');

    const image = new Image();
    await new Promise(r => image.onload = r, image.setAttribute('src', crops.full.toDataURL()));
    image.classList.add('original');
    target.appendChild(image);

  } else {
    target.appendChild(crops.full);
    crops.full.classList.add('original');
  }


  const tooltip = document.querySelector('#colorHelperBrowserExtensionInspectionOverlay .tooltip');

  await lookup.init(settings.showShadePrefix);
  const analyzer = new Analyzer()
  const canvases = await analyzer.analyze(lookup, crops);

  canvases.forEach(c => {
    target.insertAdjacentElement('afterbegin', c);
  });

  overlay.classList.remove('loading');

  const fullContext = crops.full.getContext('2d', { willReadFrequently: true });
  const scaledContext = crops.scaled.getContext('2d', { willReadFrequently: true });


  target.addEventListener('mousemove', (e) => {

    const node = e.currentTarget.closest('.pause-on-click');
    if (node?.classList.contains('paused')) {
      return;
    }

    const fullSizeX = e.layerX * window.devicePixelRatio;
    const fullSizeY = e.layerY * window.devicePixelRatio;

    const scaleFactor = crops.scaled.width / crops.full.width;
    const scaledX = Math.round(fullSizeX * scaleFactor);
    const scaledY = Math.round(fullSizeY * scaleFactor);

    const pixel = fullContext.getImageData(fullSizeX, fullSizeY, 1, 1).data;
    const scaledPixel = scaledContext.getImageData(scaledX, scaledY, 1, 1).data;

    tooltip.style.setProperty('--swatch-color', `rgb(${scaledPixel.slice(0, 3).join(',')})`);
    tooltip.classList.add('visible');

    console.log(settings);

    const virtualEl = {
      getBoundingClientRect() {
        return {
          width: 0,
          height: 0,
          x: e.clientX,
          y: e.clientY,
          left: e.clientX,
          right: e.clientX,
          top: e.clientY,
          bottom: e.clientY
        };
      }
    };

    $FloatingUIDOM.computePosition(virtualEl, tooltip, {
      placement: "right-start",
      middleware: [$FloatingUIDOM.offset({
        mainAxis: 12,
        crossAxis: 18
      }), $FloatingUIDOM.flip(), $FloatingUIDOM.shift()]
    }).then(({ x, y }) => {
      Object.assign(tooltip.style, {
        top: `${y}px`,
        left: `${x}px`
      });
    });


    const shade = lookup.shade(scaledPixel[0], scaledPixel[1], scaledPixel[2]);
    const color = lookup.bestMatch(pixel[0], pixel[1], pixel[2]);

    
    target.querySelector('.active')?.classList.remove('active');
    target.querySelector(`[data-shade="${shade}"]`)?.classList.add('active');

    const deltaE = color.colors[0].deltaE;
    let matchQuality;
    if (deltaE === 0) {
      matchQuality = 'exact match';
    }
    else if (deltaE <= 0.5) {
      matchQuality = 'almost exact match';
    }
    else if (deltaE <= 1) {
      matchQuality = 'very close match';
    }
    else if (deltaE <= 2) {
      matchQuality = 'close match';
    }
    else if (deltaE <= 4) {
      matchQuality = 'fair match';
    }
    else if (deltaE <= 5) {
      matchQuality = 'moderate match';
    }
    else {
      matchQuality = 'poor match';
    }

    let altShade = false;
    let i = 0;
    while (!altShade) {
      if (!color.colors[0].ginifab[i]) {
        break;
      }

      if (color.colors[0].ginifab[i] !== shade) {
        altShade = color.colors[0].ginifab[i];
        break;
      }

      i++;
    }

    if (!settings.pauseOnClick) {
      tooltip.querySelector('.hint').style.setProperty('display', 'none');
    }


    tooltip.querySelector('.shade-name').textContent = shade;
    tooltip.querySelector('.alt-shade-name').textContent = altShade || '';
    tooltip.querySelector('.color-name').textContent = color.colors[0].alias[0];
    tooltip.querySelector('.quality').textContent = matchQuality;
    tooltip.querySelector('.delta-e').textContent = deltaE.toFixed(2);
    tooltip.querySelector('.color-rgb').textContent = scaledPixel.slice(0, 3).join(',');
    tooltip.querySelector('.color-hex').textContent = rgbToHex(...scaledPixel.slice(0, 3));

  });

  target.addEventListener('mouseout', (e) => {
    const node = e.currentTarget.closest('.pause-on-click');

    if (node?.classList.contains('paused')) {
      return;
    }

    target.querySelector('.active')?.classList.remove('active');
    tooltip.classList.remove('visible');
  });

  if (settings.pauseOnClick) {
    target.addEventListener('click', (e) => {

      if (!['CANVAS', 'IMG'].includes(e.target.tagName)) {
        return;
      }

      const node = e.currentTarget.closest('.pause-on-click');
      node?.classList.toggle('paused');
    });
  }

  function close(e) {
    document.querySelector('#colorHelperBrowserExtensionInspectionOverlay').remove();
  }

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      close()
    }
  });

  tooltip.addEventListener('click', (e) => {
    const cb = e.target.closest('.copy-button');
    if (cb) {
      e.preventDefault();
      copyToClipboard(cb.previousElementSibling.textContent)
      cb.textContent = 'copied!';
      setTimeout(() => {
        cb.textContent = 'copy';
      }, 1000);
    }
  });

  document.getElementById('colorHelperBrowserExtensionInspectionOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      close();
    }
  });

}



async function getSelectedPixels() {


  const permissionsState = await chrome.runtime.sendMessage({
    message: 'check-permission'
  });



  if (!permissionsState.captureVisibleTab) {
    return false;
  }

  const screenshot = await chrome.runtime.sendMessage({
    message: 'capture', format: 'png', quality: 100
  });



  const width = SELECTION.w * window.devicePixelRatio;
  const height = SELECTION.h * window.devicePixelRatio;
  const left = SELECTION.x * window.devicePixelRatio;
  const top = SELECTION.y * window.devicePixelRatio;

  if (width * height < 10 || Number.isNaN(width * height)) {
    throw new Error('Selection too small');
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  const canvasToProcess = document.createElement('canvas');
  const contextToProcess = canvasToProcess.getContext('2d', { willReadFrequently: true });

  const rawImage = new Image();
  await new Promise(r => rawImage.onload = r, rawImage.setAttribute('src', screenshot.image));

  const pixelsToProcess = parseInt(settings.maxPixels);

  let scaledWidth = width;
  let scaledHeight = height;

  if (width * height > pixelsToProcess) {
    scaledWidth = Math.round(Math.sqrt((pixelsToProcess * width) / height));
    scaledHeight = Math.round(Math.sqrt((pixelsToProcess * height) / width));
  }

  canvasToProcess.setAttribute('width', scaledWidth);
  canvasToProcess.setAttribute('height', scaledHeight);
  contextToProcess.drawImage(rawImage, left, top, width, height, 0, 0, scaledWidth, scaledHeight);

  canvas.setAttribute('width', width);
  canvas.setAttribute('height', height);
  context.drawImage(rawImage, left, top, width, height, 0, 0, width, height);

  return { full: canvas, scaled: canvasToProcess };
}


function hideOverlay(force) {

  if (!force && selectionOverlay.classList.contains('capture-in-progress')) {
    return;
  }


  selectionOverlay.classList.add('hidden');
  selectionOverlay.classList.remove('selecting', 'hide-ants', 'capture-in-progress');
}

function resetOverlayNode() {
  ['data-start-x', 'data-start-y', 'style'].forEach(attr => selectionOverlay.removeAttribute(attr));
}

function removeAnalyzer() {

  document.getElementById('colorHelperBrowserExtensionInspectionOverlay')?.remove();

}

function captureFullScreen() {
  removeAnalyzer();


  applySelection(
    0,
    0,
    document.documentElement.clientWidth,
    document.documentElement.clientHeight,
  )

  selectionOverlay.classList.add('selecting');
  captureSelection();
}

async function captureSelection(e) {
  e?.preventDefault();
  e?.stopPropagation();

  if (selectionOverlay.classList.contains('selecting')) {
    selectionOverlay.classList.remove('selecting');
    selectionOverlay.classList.add('hide-ants', 'capture-in-progress');

    //wait for two frames (at 60fps) to allow the browser to redraw
    await new Promise(r => { setTimeout(r, 33) });

    LOG_TIMINGS && console.time('COLORHELPER::getSelectedPixels');
    let crops;
    try {
      crops = await getSelectedPixels();


      if (!crops) {

        showErrorMessage()
        return false;
      }

    } catch (e) {
      hideOverlay(true);
      return false;
    }
    LOG_TIMINGS && console.timeEnd('COLORHELPER::getSelectedPixels');

    showAnalysis(crops);
  }
  else {
    hideOverlay();
  }

}


async function initialize() {

  if (selectionOverlay) {
    resetOverlayNode();
    removeAnalyzer();
    selectionOverlay.classList.remove('hidden', 'capture-in-progress', 'hide-ants', 'selecting');
    return;
  }
  settings = await chrome.storage.sync.get()

  let theme = settings.colorTheme;
  if (theme === 'System') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light';
  }

  document.documentElement.dataset.colorHelperTheme = theme;

  LOG_TIMINGS = settings.logTimings;
  CHARTDOWNSAMPLE = settings.chartDownSampleFactor;

  selectionOverlay = document.createElement('div');
  selectionOverlay.setAttribute('id', 'colorHelperBrowserExtensionSelectionOverlay');
  document.body.appendChild(selectionOverlay);

  selectionOverlay.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    resetOverlayNode(e.target);
    e.target.classList.add('selecting');

    SELECTION_START = {
      x: e.pageX - window.scrollX,
      y: e.pageY - window.scrollY,
    }
  });

  selectionOverlay.addEventListener('mouseup', captureSelection);

  selectionOverlay.addEventListener('mousemove', (e) => {
    if (ANALYZE_OPTIONS.action === 'dom') {

      e.target.classList.add('selecting');

      const x = e.pageX - window.scrollX;
      const y = e.pageY - window.scrollY;

      const elem = document.elementsFromPoint(x, y)[1];

      if (elem) {
        const bounds = elem.getBoundingClientRect();

        const x = bounds.x;
        const y = bounds.y;

        applySelection(
          x,
          y,
          bounds.width,
          bounds.height
        )
      }


      return;
    }

    if (!e.target.classList.contains('selecting')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const x = e.pageX - window.scrollX;
    const y = e.pageY - window.scrollY;

    applySelection(
      Math.min(SELECTION_START.x, x),
      Math.min(SELECTION_START.y, y),
      Math.abs(x - SELECTION_START.x),
      Math.abs(y - SELECTION_START.y)
    )
  });

  ['click', 'dblclick', 'contextmenu'].forEach(event => {
    selectionOverlay.addEventListener(event, e => {
      e.preventDefault();
      e.stopPropagation();
      hideOverlay();
    });
  });



  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      hideOverlay();
    }


    if (e.code === 'Space' && !selectionOverlay?.classList.contains('hidden')) {
      e.preventDefault();
      e.stopPropagation();
      captureFullScreen();
    } else if (e.code === 'KeyD' && !selectionOverlay?.classList.contains('hidden')) {
      selectionOverlay?.classList.add('selecting');
      ANALYZE_OPTIONS.action = 'dom';
    }
  });
}

function showErrorMessage() {

  hideOverlay(true);
  document.body.insertAdjacentHTML('beforeend', permissionErrorMessage);

  document.getElementById('colorHelperBrowserExtensionPermissionError').addEventListener('click', (e) => {
    e.currentTarget.remove();
  });

}


chrome.runtime.onMessage.addListener(async (req, sender, res) => {
  if (req.message === 'init') {

    res({})
    await initialize();

    ANALYZE_OPTIONS = req.options;
    if (ANALYZE_OPTIONS.action === 'viewport') {
      captureFullScreen(req.options.type);
    }

  }
  return true
})
