
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
  showMatchQuality: false,
  showAlternativeShade: false,
  popupGroups: [
    {
      name: "Colors & Shades",
      id: "colors",
      shortcutId: "color-helper",
      items: [
        {
          id: "selection",
          icon: 'SELECTION',
          action: "Selection",
          show: true
        },
        {
          id: "dom",
          icon: 'DOMNODE',
          action: "DOM Element",
          shortcut: "D",
          show: true
        },
        {
          id: "viewport",
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

function inject(tab, options = { type: 'colors', action: 'selection' }) {
  chrome.tabs.sendMessage(tab.id, { message: 'init', options }, (res) => {
    if (res) {
      clearTimeout(timeout)
    }
  })

  var timeout = setTimeout(async () => {
    await chrome.scripting.insertCSS({ files: ['content/index.css'], target: { tabId: tab.id } })

    await chrome.scripting.executeScript({
      files: [
        'content/copyToClipboard.js',
        'content/floating-ui.core-1.6.0.umd.js',
        'content/floating-ui.dom-1.6.3.umd.js',
        'content/Analyzer.js',
        'content/index.js',
        'node_modules/chroma-js/chroma.js',
        'node_modules/@mtillmann/colors/dist/umd/colors.js',
      ], target: { tabId: tab.id }
    })



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

  if (req.message === 'inject') {
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




chrome.runtime.onInstalled.addListener(() => {
  [
    {
      title: 'Analyze Image',
      id: 'che_analyze_image',
      contexts: ['image']
    },
    {
      title: 'Analyze Selection',
      id: 'che_analyze_selection',
      contexts: ['all']
    },
    {
      title: 'Analyze DOM Element',
      id: 'che_analyze_dom_element',
      contexts: ['all']
    },
    {
      title: 'Analyze Viewport',
      id: 'che_analyze_viewport',
      contexts: ['all']
    },
    {
      id: 'separator',
      type: 'separator',
      contexts: ['all']
    },
    {
      title: 'Open Settings',
      id: 'che_settings',
      contexts: ['all']
    }
  ].forEach((item) => {
    chrome.contextMenus.create(item)
  });

});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'che_analyze_selection':
      inject(tab)
      break;
    case 'che_analyze_dom_element':
      inject(tab, { type: 'colors', action: 'dom' })
      break;
    case 'che_analyze_viewport':
      inject(tab, { type: 'colors', action: 'viewport' })
      break;
    case 'che_settings':
      chrome.runtime.openOptionsPage()
      break;
    case 'che_analyze_image':
      inject(tab, { type: 'colors', action: 'dom', info })
      break;
  }
});