function onFenixReady (cb) {

  window.thisID = qsp('i')

  cb()
}

function qsp (name, url) {
  if (!url) url = window.location.href
  name = name.replace(/[\[\]]/g, '\\$&')
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url)
  if (!results) return null
  if (!results[2]) return ''
  return decodeURIComponent(results[2].replace(/\+/g, ' '))
}

function sendEvent (eventName) {
  if (!window.thisID && !window.FenixH5) console.error('window.thisID not set, please use onFenixReady()')

  if ((eventName.length > 0 && eventName.length < 16)) {
    if (window.FenixH5) {
      window.InspiredFenix[0].Calls.m(eventName)
    } else {
      window.parent.postMessage(
        { type: 'm', id: window.thisID, metric: eventName },
        '*'
      )
    }
  } else {
    console.error('%c[FENIX] %cCustom metric did not pass validation and was not sent. Please ensure %c' + eventName + ' %cconforms to the rules!', 'font-weight: bold; color: #FFF;', 'font-weight: normal; color: red;','font-weight: bold; color: #FFF;', 'font-weight: normal; color: red;')
  }
}

function requestViewability (format) {
  window.parent.postMessage({ type: 'v', id: window.thisID, format: format }, '*')
}

function requestGyro () {
  window.parent.postMessage({ type: 'g', id: window.thisID}, '*')
}

function retargetCampaign(cmp, cb) {
  window.parent.postMessage({ type: 'fc', id: window.thisID, cmp: cmp }, '*')
  document.body.onmessage = function (e) {
    if (e.data.type == 'fc') {
      cb(JSON.parse(e.data.message))
      e.preventDefault()
    }
  }
}

function retargetCreative(cmp, crt, cb) {
  window.parent.postMessage({ type: 'fcc', id: window.thisID, cmp: cmp, crt: crt }, '*')
  document.body.onmessage = function (e) {
    if (e.data.type == 'fcc') {
      cb(JSON.parse(e.data.message))
      e.preventDefault()
    }
  }
}


function firstScrollContainerBottom () {
  window.parent.postMessage({ type: 'firstScrollContainerBottom', id: window.thisID }, '*')
}

function hideContainerByBottom () {
  window.parent.postMessage({ type: 'hideContainerByBottom', id: window.thisID }, '*')
}

function adjustCreative (width, height, options) {
  if (!options) options = {}
  window.parent.postMessage({ type: 'cr', id: window.thisID, data: {Width: width, Height: height, Options: options}}, '*')
}

function openSecondary () {
  window.parent.postMessage({ type: 'os', id: window.thisID, data: {}}, '*')
}