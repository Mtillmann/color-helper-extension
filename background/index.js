
//await chrome.storage.sync.clear()

//this controls which keys are stored in the storage and what is reverted to default in the options page
const defaults = {
  maxPixels: 100000,
  highlightColorShade: true,
  reduceUnmatchedOpacity: false,
  unmatchedOpacity: 50,
  desaturateUnmatched: true,
  unmatchedSaturation: 25,
  outlineMatched: true,
  outlineColor: "#000000",
  pauseOnClick: true,
  colorTheme: "Canvas",
  analyzerBackgroundMode: "theme",
  analyzerBackground: "#888888",
  logTimings: false,
  useCompatMode: false,
  showShadePrefix: true,
  popupGroups: [
    {
      name: "Colors & Shades",
      id: "colors",
      shortcutId: "color-helper",
      items: [
        {
          id : "selection",
          icon: 'SELECTION',
          action: "Selection",
          show: true
        },
        {
          id : "dom",
          icon: 'DOMNODE',
          action: "DOM Element",
          shortcut: "D",
          show: true
        },
        {
          id : "viewport",
          icon: 'VIEWPORT',
          action: "Viewport",
          shortcut: "SPACE",
          show: true
        }

      ]
    }, {
      name: "Settings",
      id: "settings",
      items: [
        {
          icon: 'GEAR',
          color: "secondary",
          show: true
        }
      ]
    }
  ]
}



chrome.storage.sync.get((store) => {
  var config = {}
  Object.assign(config, defaults, JSON.parse(JSON.stringify(store)))

  config.defaultState = JSON.parse(JSON.stringify(defaults));

  chrome.storage.sync.set(config)

  chrome.action.setIcon({
    path: [16, 19, 38, 48, 128].reduce((all, size) => (
      all[size] = `/icons/${size}x${size}.png`,
      all
    ), {})
  })
})

function inject(tab, options = {type : 'colors', action : 'selection'}) {
  chrome.tabs.sendMessage(tab.id, { message: 'init', options }, (res) => {
    if (res) {
      clearTimeout(timeout)
    }
  })

  var timeout = setTimeout(() => {
    chrome.scripting.insertCSS({ files: ['content/index.css'], target: { tabId: tab.id } })


    chrome.scripting.executeScript({ files: ['content/DeltaE00.js'], target: { tabId: tab.id } })
    chrome.scripting.executeScript({ files: ['content/RGBToLAB.js'], target: { tabId: tab.id } })
    chrome.scripting.executeScript({ files: ['content/Analyzer.js'], target: { tabId: tab.id } })
    chrome.scripting.executeScript({ files: ['content/Lookup.js'], target: { tabId: tab.id } })
    chrome.scripting.executeScript({ files: ['content/index.js'], target: { tabId: tab.id } })

    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, { message: 'init', options })
    }, 100)
  }, 100)
}

chrome.action.onClicked.addListener((tab) => {
  if ('geckoProfiler' in chrome) {
    browser.permissions.request({ origins: ['<all_urls>'] })
  }
  inject(tab)
})

chrome.commands.onCommand.addListener((command) => {
  if (command === 'color-helper') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tab) => {
      inject(tab[0])
    })
  }
})

chrome.runtime.onMessage.addListener((req, sender, res) => {

  if(req.message === 'inject') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tab) => {
      inject(tab[0], req.options)
    });
  }

  if (req.message === 'check-permission') {
    res({
      message: 'permission-state',
      tabs: 'tabs' in chrome,
      captureVisibleTab: 'tabs' in chrome && 'captureVisibleTab' in chrome.tabs,
      isGecko: 'geckoProfiler' in chrome,
    })
  }

  if (req.message === 'capture') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tab) => {
      chrome.tabs.captureVisibleTab(tab.windowId, { format: req.format, quality: req.quality }, (image) => {
        // image is base64
        res({ message: 'image', image })
      })
    })
  }

  return true
})