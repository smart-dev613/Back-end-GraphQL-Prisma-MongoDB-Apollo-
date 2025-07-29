var caster_id = gup('casterId')
var ios = iOSversion()
var cts_link = document.getElementById('cts')

cts_link.addEventListener('click', function () {
  sendEvent('click_to_site')
  // console.log('cts sent')
  // parent.postMessage(
  //   {
  //     origin: 'ImagineIframeCustomEvent',
  //     id: 14,
  //     sendFrom: caster_id
  //   },
  //   '*'
  // )
  // parent.postMessage(
  //   {
  //     origin: 'customEventV5',
  //     data: {
  //       div_id: caster_id,
  //       userEvent: 'click_to_site'
  //     }
  //   },
  //   '*'
  // )
})

var myUrl = window.location.href
var start = myUrl.indexOf('redirect=')
var end = myUrl.length
var rederict = ''
if (start > 0) {
  var rederict = myUrl.substring(start, end).replace('redirect=', '')
}

if (rederict != null && (ios[0] == 8 || ios[0] == 9)) {
  cts_link.setAttribute('href', rederict)
  cts_link.setAttribute('target', '_blank')
}

function gup (name, url) {
  if (!url) url = location.href
  name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]')
  var regexS = '[\\?&]' + name + '=([^&#]*)'
  var regex = new RegExp(regexS)
  var results = regex.exec(url)
  return results == null ? null : results[1]
}

function iOSversion () {
  if (/iP(hone|od|ad)/.test(navigator.platform)) {
    // supports iOS 2.0 and later: <http://bit.ly/TJjs1V>
    var v = navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/)
    return [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)]
  }
  return [0]
}
