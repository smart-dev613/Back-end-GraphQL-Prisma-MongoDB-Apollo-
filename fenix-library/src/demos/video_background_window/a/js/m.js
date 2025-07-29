var video = document.getElementById('video')
var content = document.getElementById('content')
var isFullScreen = false
var videoStarted = false
var videoEnded = false
var windowHeight
var windowWidth

function moveBackground (viewObj) {
  var scalefactor = 1
  if (windowHeight > 667) scalefactor = 667 / windowHeight
  var finalHeight = viewObj.top * scalefactor
  video.style.transform = 'translate(-50%, ' + -finalHeight + 'px)'
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
    video.style.width = windowWidth
    video.style.height = windowHeight + 'px'
  }

  if (viewObj.top < windowHeight && viewObj.viewPercentage && !videoEnded) {
    video.play()
    if (!videoStarted) {
      sendEvent('video_play')
      videoStarted = true
    }
  }

  if (!viewObj.viewPercentage) video.pause() // Video out of view

  if (!isFullScreen) moveBackground(viewObj)
}

onFenixReady(function () {
  requestViewability()
  startEvents()

  video.onended = function () {
		videoEnded = true
    sendEvent('main_video_complete')
  }

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
