// Format specific code for full expandables
this.Render = function () {
  var creativewindow = document.createElement('iframe')
  var primaryOverlay = document.createElement('div')

  if (this.Config.Assets[0].Path.includes('?')) {
    creativewindow.src = this.Config.Assets[0].Path + '&i=' + this.Config.Session
  } else {
    creativewindow.src = this.Config.Assets[0].Path + '?i=' + this.Config.Session
  }
  
  var creativeWidth = null
  var creativeHeight = null

  if (this.Config.Assets[0].Width.includes('%')) creativeWidth = this.Config.Assets[0].Width
  else creativeWidth = parseInt(this.Config.Assets[0].Width) + 'px'

  if (this.Config.Assets[0].Height.includes('%')) creativeHeight = this.Config.Assets[0].Height
  else creativeHeight = parseInt(this.Config.Assets[0].Height) + 'px'

  creativewindow.style.height = creativeHeight
  creativewindow.style.width = creativeWidth
  primaryOverlay.style.height = creativeHeight
  primaryOverlay.style.width = creativeWidth
  primaryOverlay.style.top = '0'
  primaryOverlay.style.left = '0'
  primaryOverlay.style.position = 'absolute'

  creativewindow.style.border = '0'
  creativewindow.style.maxWidth = '100%'

  //for gpt formats
var container = fenix.Config.Container
if (window.frameElement) {
    // inside of a gpt container
    container = window.frameElement
} else {
    container.parentNode.style.overflow = 'hidden'
    container.parentNode.style.position = 'fixed'
}
  // fenix.Config.Container.style.textAlign = 'center'
  fenix.Config.Container.appendChild(creativewindow)
  fenix.Config.Container.appendChild(primaryOverlay)

  this.Aux.openSecondary = function () {
    console.log('open secondary')
    var secondaryContainer = document.createElement('div')
    secondaryContainer.id = this.Config.Container.id + '-int'

    this.Config.Container.appendChild(secondaryContainer)


    var secondarywindow = document.createElement('iframe')
    if (this.Config.Assets[1].Path.includes('?')) {
      secondarywindow.src = this.Config.Assets[1].Path + '&i=' + this.Config.Session
    } else {
      secondarywindow.src = this.Config.Assets[1].Path + '?i=' + this.Config.Session
    }
    if (this.Config.Assets[1].Width.substr(-1) === '%') secondarywindow.style.width = this.Config.Assets[1].Width
    else secondarywindow.style.width = parseInt(this.Config.Assets[1].Width) + 'px'
    if (this.Config.Assets[1].Height.substr(-1) === '%') secondarywindow.style.height = this.Config.Assets[1].Height
    else secondarywindow.style.height = parseInt(this.Config.Assets[1].Height) + 'px'
    secondarywindow.style.margin = 'auto'
    secondarywindow.style.border = '0'
    secondarywindow.style.borderStyle = 'none'
    secondarywindow.style.top = '0px'
    secondarywindow.style.left = '0px'
    secondarywindow.style.right = '0px'
    secondarywindow.style.bottom = '0px'
    secondarywindow.style.position = 'absolute'
    secondarywindow.style.clear = 'both'

    var closeButton = document.createElement('button')
    closeButton.id = 'closeButton'
    closeButton.style.border = 'none'
    closeButton.style.height = '45px'
    closeButton.style.width = '45px'
    closeButton.style.position = 'fixed'
    closeButton.style.right = '0'
    closeButton.style.top = '0'
    closeButton.style.zIndex = '2147483647'
    closeButton.style.background = 'url(\"https://media-cdn.synkd.life/close_circle.png\") no-repeat center center'
    closeButton.style.backgroundSize = '50% 50%'
    closeButton.addEventListener('click', function () {
      // if (!fenix.Config.MRAID) {
      //   secondaryContainer.parentNode.style.overflow = ''
      //   secondaryContainer.parentNode.style.position = ''
      //   secondaryContainer.style.display = 'none'
      // } else mraid.close()

      // this.Calls.m('close')

      secondaryContainer.remove()
    }.bind(this))

    secondaryContainer.style.textAlign = 'center'
    secondaryContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
    if (!fenix.Config.MRAID) secondaryContainer.style.position = 'fixed'
    else secondaryContainer.style.position = 'absolute'
    secondaryContainer.style.top = '0px'
    secondaryContainer.style.left = '0px'
    secondaryContainer.style.right = '0px'
    secondaryContainer.style.bottom = '0px'
    secondaryContainer.style.overflow = 'hidden'
    secondaryContainer.style.height = '100%'
    secondaryContainer.style.width = '100%'
    secondaryContainer.style.zIndex = '2147483647'

    // secondaryContainer.parentNode.style.overflow = 'hidden'
    // secondaryContainer.parentNode.style.position = 'fixed'

    secondaryContainer.appendChild(closeButton)
    secondaryContainer.appendChild(secondarywindow)

  }.bind(this)

  primaryOverlay.addEventListener('click', function () {
    console.log('container clicked')
    fenix.Aux.openSecondary()
  })
}

this.Render()
