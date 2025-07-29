var windowHeight
var windowWidth

var body = document.querySelector('body')
var background = document.getElementById('bg')
var watch = document.getElementById('watch')
var cta = document.getElementById('cta')

function animate (viewObj) {
  if (banner_size == '300250') {
    var scalefactor = 1

    if (windowHeight > 667) scalefactor = 667 / windowHeight

    var finalHeight = viewObj.top * scalefactor

    if (finalHeight > 415) finalHeight = 415
    else if (finalHeight < 0) finalHeight = 0

    // background.style.backgroundPositionY = -finalHeight + 'px'
    background.style.transform = 'translate(-50%, ' + -finalHeight + 'px)'

    var watchValue = finalHeight * 0.15

    if (watchValue > 35) {
      watch.style.transform = 'translateY(' + -(watchValue - 35) + 'px)'
    }
    if (watchValue > 45) {
      cta.style.opacity = '0'
    }
    if (watchValue <= 45) {
      cta.style.opacity = '1'
    }
  }
}

function updateViewport (view) {
  windowWidth = view.windowWidth
  windowHeight = view.windowHeight
}

function viewabilityChange (viewObj) {
  if (
    windowWidth !== viewObj.windowWidth ||
    windowHeight !== viewObj.windowHeight
  ) {
    updateViewport(viewObj)
    background.style.width = windowWidth
    background.style.height = windowHeight + 'px'
  }

  if (viewObj.viewPercentage) {
    animate(viewObj)
  }
}

onFenixReady(function () {
  requestViewability()

  window.addEventListener(
    'message',
    function (e) {
      if (e.data.type === 'v' && e.data.message) {
        viewabilityChange(e.data.message)
      }
    },
    false
  )
})
