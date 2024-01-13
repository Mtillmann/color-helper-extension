
let settings;
let LOG_TIMINGS = false;
let selectionOverlay = null;
let SELECTION = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
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

  let theme = settings.colorTheme;
  const classes = ['loading'];
  const styles = [
    `--w: ${SELECTION.w}px`,
    `--h: ${SELECTION.h}px`,
    `--x: ${SELECTION.x}px`,
    `--y: ${SELECTION.y}px`,
  ];


  if (theme === 'System') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light';
  }

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

  if (settings.analyzerBackground !== 'auto') {
    classes.push('use-custom-analyzer-background');
    styles.push(`--analyzer-background: ${settings.analyzerBackground}`);
  }

  return `
<div id="isItRedBrowserExtensionInspectionOverlay"
  data-theme="${theme}"
  data-random="${Math.random().toString(36).substring(2)}"
  class="${classes.join(' ')}"
  style="${styles.join('; ')}"
>
  <div class="tooltip">
    <strong class="shade-name">asdf</strong>
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

async function showAnalysis(crops) {

  document.body.insertAdjacentHTML('beforeend', template());

  //hide the overlay late to avoid interaction during capture
  hideOverlay(true);

  //without this line the whole loading spinner and backdrop filter
  //will only work ONCE per page load... no idea why
  await new Promise(r => { setTimeout(r, 33) });

  const overlay = document.getElementById('isItRedBrowserExtensionInspectionOverlay');

  const target = overlay.querySelector('.target');
  target.appendChild(crops.full);
  crops.full.classList.add('original');

  const tooltip = document.querySelector('#isItRedBrowserExtensionInspectionOverlay .tooltip');

  await lookup.init();
  const shadeCanvases = new Analyzer().analyze(
    lookup,
    crops,
    {
      targetWidth: SELECTION.w,
      targetHeight: SELECTION.h,
    });

  shadeCanvases.forEach(c => {
    target.insertAdjacentElement('afterbegin', c);
  });

  overlay.classList.remove('loading');

  const fullContext = crops.full.getContext('2d', { willReadFrequently: true });
  const scaledContext = crops.scaled.getContext('2d', { willReadFrequently: true });

  target.addEventListener('mousemove', (e) => {

    const node = e.currentTarget.closest('.pause-on-click');

    console.log(node, node?.classList.contains('paused'))

    if (node?.classList.contains('paused')) {
      console.log('aborting move')
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

      if (e.target.tagName !== 'CANVAS') {
        return;
      }

      const node = e.currentTarget.closest('.pause-on-click');
      node?.classList.toggle('paused');
    });
  }

  function close(e) {
    document.querySelector('#isItRedBrowserExtensionInspectionOverlay').remove();
  }

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      close()
    }
  });


  document.getElementById('isItRedBrowserExtensionInspectionOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      close();
    }
  });

}



async function getSelectedPixels() {
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

  document.getElementById('isItRedBrowserExtensionInspectionOverlay')?.remove();

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
    selectionOverlay.classList.add('hide-ants', 'capture-in-progress');

    //wait for two frames (at 60fps) to allow the browser to redraw
    await new Promise(r => { setTimeout(r, 33) });

    LOG_TIMINGS && console.time('COLORHELPER::getSelectedPixels');
    let crops;
    try {
      crops = await getSelectedPixels();
    } catch (e) {
      console.error(e);
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

  LOG_TIMINGS = settings.logTimings;


  selectionOverlay = document.createElement('div');
  selectionOverlay.setAttribute('id', 'isItRedBrowserExtensionSelectionOverlay');
  document.body.appendChild(selectionOverlay);

  selectionOverlay.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    resetOverlayNode(e.target);
    e.target.classList.add('selecting');
    //todo refactor this to in memory data
    e.target.dataset.startX = e.pageX - window.scrollX;
    e.target.dataset.startY = e.pageY - window.scrollY;
  });

  selectionOverlay.addEventListener('mouseup', captureSelection);

  selectionOverlay.addEventListener('mousemove', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const x = e.pageX - window.scrollX;
    const y = e.pageY - window.scrollY;

    applySelection(
      Math.min(parseInt(selectionOverlay.dataset.startX), x),
      Math.min(parseInt(selectionOverlay.dataset.startY), y),
      Math.abs(x - parseInt(selectionOverlay.dataset.startX)),
      Math.abs(y - parseInt(selectionOverlay.dataset.startY))
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


chrome.runtime.onMessage.addListener((req, sender, res) => {
  if (req.message === 'init') {
    res({})
    initialize();
  }
  return true
})
