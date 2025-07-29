onFenixReady(function () {
  // document.querySelector('.outer').style.opacity = '1'

  document.querySelector('.outer').addEventListener('click', function() {
    sendEvent('click_to_site')
  })
})
