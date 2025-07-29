// Format specific code for sticky banner
// 'fenix' is available
this.Render = function () {

  //creative container
  var creativewindow = document.createElement('iframe')
  if (this.Config.Assets[0].Path.includes('?')) {
    creativewindow.src = this.Config.Assets[0].Path + '&i=' + this.Config.Session 
  } else {
    creativewindow.src = this.Config.Assets[0].Path + '?i=' + this.Config.Session 
  }
  if (this.Config.Assets[0].Width.includes('%')) creativewindow.style.width = this.Config.Assets[0].Width
  else creativewindow.style.width = parseInt(this.Config.Assets[0].Width) + 'px'
  
  creativewindow.style.height = this.Config.Assets[0].Height + 'px'
  creativewindow.style.margin = 'auto'
  creativewindow.style.border = '0'
  creativewindow.style.borderStyle = 'none'
  creativewindow.style.left = '0px!important'
  creativewindow.style.right = '0px'
  creativewindow.style.top = '0px'
  creativewindow.style.clear = 'both'

// close button
  var closeButton = document.createElement('button')
  closeButton.id = 'closeButton'
  closeButton.style.border = 'none'
  closeButton.style.height = '45px'
  closeButton.style.width = '45px'
  closeButton.style.position = 'absolute'
  closeButton.style.right = '0'
  closeButton.style.top = fenix.Config.Container.style.height
  closeButton.style.zIndex = '2147483647'
  closeButton.style.background = 'url(\"https://media-cdn.synkd.life/close_circle.png\") no-repeat center center'
  closeButton.style.backgroundSize = '50% 50%'
  closeButton.addEventListener('click', function () {
    if (!fenix.Config.MRAID) {
      fenix.Config.Container.parentNode.style.overflow = ''
      fenix.Config.Container.parentNode.style.position = ''
      fenix.Config.Container.innerHTML = '<!-- stickybanner was closed -->'
      fenix.Config.Container.style.display = 'none'
      fenix.Aux.stop()
    } else mraid.close()

    this.Calls.m('close')
  }.bind(this))

//ad container
  fenix.Config.Container.style.textAlign = 'center'
  fenix.Config.Container.style.position = 'fixed'
  fenix.Config.Container.style.overflow = 'hidden'
  fenix.Config.Container.style.height = this.Config.Assets[0].Height + 'px'
  fenix.Config.Container.style.width = this.Config.Assets[0].Width + 'px'
  fenix.Config.Container.style.bottom = '0' 
  fenix.Config.Container.style.left = '0'
  fenix.Config.Container.style.zIndex = '2147483647'
  fenix.Config.Container.style.transition = 'bottom 0.5s ease-in-out'
  
  fenix.Config.Container.appendChild(closeButton)
  fenix.Config.Container.appendChild(creativewindow)
}
this.Render()

