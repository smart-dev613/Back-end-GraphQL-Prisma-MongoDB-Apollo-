function startEvents () {
  video = document.getElementById('video')

  video.pause()

  text2 = document.querySelector('.text2')
  text3 = document.querySelector('.text3')
  text4 = document.querySelector('.text4')
  text5 = document.querySelector('.text5')
  text6 = document.querySelector('.text6')
  logo7 = document.querySelector('.logo7')
  logo8 = document.querySelector('.logo8')
  replay = document.querySelector('.replay')
  button = document.querySelector('.button')

  video.ontimeupdate = function () {
    var sec = parseInt(video.currentTime)
    switch (sec) {
      case 0:
        logo7.style.opacity = 0
        logo8.style.opacity = 0
        break
      case 1:
        logo7.style.opacity = 0
        logo8.style.opacity = 0
        text2.style.opacity = 1
        break
      case 3:
        text2.style.opacity = 0
        setTimeout(function () {
          text3.style.opacity = 1
        }, 500)
        break
      case 5:
        text3.style.opacity = 0
        setTimeout(function () {
          text4.style.opacity = 1
        }, 1000)
        break
      case 8:
        text4.style.opacity = 0
        setTimeout(function () {
          text5.style.opacity = 1
        }, 500)
        break
      case 11:
        text5.style.opacity = 0
        setTimeout(function () {
          button.style.opacity = 1
          text6.style.opacity = 1
          logo7.style.opacity = 1
          buttonEvent()
        }, 500)

        break
      case 15:
        text6.style.opacity = 0
        setTimeout(function () {
          logo8.style.opacity = 1
          replay.style.opacity = 1
        }, 500)

        break
      case 17:
        video.pause()
        break
    }
  }

  buttons()

  function buttons () {
    replay = document.querySelector('.replay')
    soundOn = document.querySelector('.soundOn')
    soundOff = document.querySelector('.soundOff')
    play = document.querySelector('#video')

    soundOn.addEventListener('click', function () {
      soundOn.style.opacity = '0'
      soundOff.style.opacity = '1'
      soundOff.style.pointerEvents = 'auto'
      soundOn.style.pointerEvents = 'none'
      play.muted = false
    })

    soundOff.addEventListener('click', function () {
      soundOff.style.opacity = '0'
      soundOn.style.opacity = '1'
      soundOff.style.pointerEvents = 'none'
      soundOn.style.pointerEvents = 'auto'
      play.muted = true
    })

    replay.addEventListener('click', function () {
      play.load()
      text2.style.opacity = 0
      text3.style.opacity = 0
      text4.style.opacity = 0
      text5.style.opacity = 0
      text6.style.opacity = 0
      logo7.style.opacity = 0
      logo8.style.opacity = 0
      replay.style.opacity = 0
      button.style.opacity = 0
      video.style.opacity = '1'
			refreshed = true
			videoEnded = false
    })
  }

  function buttonSizeExpand () {
    button.style.width = '125px'
  }

  function buttonSizeRetract () {
    button.style.width = '115px'
  }

  function buttonEvent () {
    setTimeout(function () {
      buttonSizeExpand()
    }, 500)
    setTimeout(function () {
      buttonSizeRetract()
    }, 1000)
    setTimeout(function () {
      buttonSizeExpand()
    }, 1500)
    setTimeout(function () {
      buttonSizeRetract()
    }, 2000)
  }
}
