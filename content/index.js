
let settings;
let LOG_TIMINGS = false;
let selectionOverlay = null;
let SELECTION = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
};
let SELECTION_START = {
  x: 0,
  y: 0,
};

const lookup = new Lookup();

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
  <div class="tooltip">
    <strong class="shade-name"></strong>
    <br>
    <span class="color-name"></span>
    <br>
    <small class="color-rgb"></small>
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
  const shadeCanvases = await analyzer.analyze(lookup, crops);

  shadeCanvases.forEach(c => {
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

    const shade = lookup.shade(scaledPixel[0], scaledPixel[1], scaledPixel[2]);
    const color = lookup.bestMatch(pixel[0], pixel[1], pixel[2]);

    target.querySelector('.active')?.classList.remove('active');
    target.querySelector(`[data-shade="${shade}"]`)?.classList.add('active');


    tooltip.querySelector('.shade-name').textContent = `Shade: ${shade}`;
    tooltip.querySelector('.color-name').textContent = 'Color: ' + color.colors[0].alias[0] + ' (ΔE=' + color.colors[0].deltaE.toFixed(2) + ')';
    tooltip.querySelector('.color-rgb').textContent = 'RGB: ' + scaledPixel.slice(0, 3).join(',');

    tooltip.style.setProperty('--swatch-color', `rgb(${scaledPixel.slice(0, 3).join(',')})`);

    tooltip.style.setProperty('top', e.clientY + 'px');
    tooltip.style.setProperty('left', (10 + e.clientX) + 'px');

    tooltip.classList.add('visible');

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

  
      if(!crops){
    
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
    }
  });
}

function showErrorMessage(){

  hideOverlay(true);
  document.body.insertAdjacentHTML('beforeend', permissionErrorMessage);

  document.getElementById('colorHelperBrowserExtensionPermissionError').addEventListener('click', (e) => {
    e.currentTarget.remove();
  });

}


chrome.runtime.onMessage.addListener((req, sender, res) => {
  if (req.message === 'init') {
    res({})
    initialize();
  }
  return true
})
