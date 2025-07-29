$(document).ready(() => {
  const videoPlay = document.getElementById('videoPlay')
  let buttonsShowing = false
  let currentWatchShowing = 0
  let changeReady = true

  function firstContentFade (event) {
    if (videoPlay.currentTime > 5.5) {
      $('.text').fadeOut(1000, () => {
        $('.buttons').css({ opacity: '1', top: '0' })
        buttonsShowing = true
      })
    }
  }

  $('.chrono-button').click(event => {
    if (buttonsShowing) {
      buttonsShowing = false
      let color = event.currentTarget.dataset.color
      let number = Number(event.currentTarget.dataset.num)
      currentWatchShowing = number
      $('#videoPlay').fadeOut(1000, () => {
        $(`.chrono-${color}`)
          .add(`.arrows h1:nth-of-type(${number})`)
          .add('.shop')
          .fadeIn(1000)
      })
      $('.buttons').fadeOut(1000)
    }
  })

  function detectswipe (el, func) {
    swipe_det = new Object()
    swipe_det.sX = 0
    swipe_det.sY = 0
    swipe_det.eX = 0
    swipe_det.eY = 0
    var min_x = 30 // min x swipe for horizontal swipe
    var max_x = 30 // max x difference for vertical swipe
    var min_y = 50 // min y swipe for vertical swipe
    var max_y = 60 // max y difference for horizontal swipe
    var direc = ''
    ele = document.getElementById(el)
    ele.addEventListener(
      'touchstart',
      function (e) {
        var t = e.touches[0]
        swipe_det.sX = t.screenX
        swipe_det.sY = t.screenY
      },
      false
    )
    ele.addEventListener(
      'touchmove',
      function (e) {
        // e.preventDefault();
        var t = e.touches[0]
        swipe_det.eX = t.screenX
        swipe_det.eY = t.screenY
      },
      false
    )
    ele.addEventListener(
      'touchend',
      function (e) {
        // horizontal detection
        if (
          (swipe_det.eX - min_x > swipe_det.sX ||
            swipe_det.eX + min_x < swipe_det.sX) &&
          (swipe_det.eY < swipe_det.sY + max_y &&
            swipe_det.sY > swipe_det.eY - max_y &&
            swipe_det.eX > 0)
        ) {
          if (swipe_det.eX > swipe_det.sX) direc = 'r'
          else direc = 'l'
        } else if (
          (swipe_det.eY - min_y > swipe_det.sY ||
            swipe_det.eY + min_y < swipe_det.sY) &&
          (swipe_det.eX < swipe_det.sX + max_x &&
            swipe_det.sX > swipe_det.eX - max_x &&
            swipe_det.eY > 0)
        ) {
          // vertical detection
          if (swipe_det.eY > swipe_det.sY) direc = 'd'
          else direc = 'u'
        }
        if (direc != '') {
          if (typeof func === 'function') func(el, direc)
        }
        direc = ''
        swipe_det.sX = 0
        swipe_det.sY = 0
        swipe_det.eX = 0
        swipe_det.eY = 0
      },
      false
    )
  }

  // set delay to avoid cycling too fast
  function setDelay () {
    changeReady = false
    setTimeout(() => {
      changeReady = true
    }, 2000)
  }

  function changeWatch (el, direction) {
    if (changeReady === true) {
      $(`.images img:nth-child(${currentWatchShowing})`).fadeOut(1000, () => {
        if (direction === 'l') {
          if (currentWatchShowing < 3) {
            currentWatchShowing += 1
          } else {
            currentWatchShowing = 1
          }
        } else {
          if (currentWatchShowing > 1) {
            currentWatchShowing -= 1
          } else {
            currentWatchShowing = 3
          }
        }
        $(`.images img:nth-child(${currentWatchShowing})`).fadeIn(1000)
      })
      $(`.arrows h1:nth-of-type(${currentWatchShowing})`).fadeOut(1000, () => {
        $(`.arrows h1:nth-of-type(${currentWatchShowing})`).fadeIn(1000)
      })
      setDelay()
    }
  }

  detectswipe('shop', changeWatch)
  videoPlay.addEventListener('timeupdate', firstContentFade)
})
