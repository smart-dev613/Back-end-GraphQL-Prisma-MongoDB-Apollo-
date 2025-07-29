// Format specific code for interstitials
// 'fenix' is available
this.Render = function () {
    var creativewindow = document.createElement('iframe')
    if (this.Config.Assets[0].Path.includes('?')) {
      creativewindow.src = this.Config.Assets[0].Path + '&i=' + this.Config.Session 
    } else {
      creativewindow.src = this.Config.Assets[0].Path + '?i=' + this.Config.Session 
    }
    if (this.Config.Assets[0].Width.substr(-1) === '%') creativewindow.style.width = this.Config.Assets[0].Width
    else creativewindow.style.width = parseInt(this.Config.Assets[0].Width) + 'px'
    if (this.Config.Assets[0].Height.substr(-1) === '%') creativewindow.style.height = this.Config.Assets[0].Height
    else creativewindow.style.height = parseInt(this.Config.Assets[0].Height) + 'px'
    creativewindow.style.margin = 'auto'
    creativewindow.style.border = '0'
    creativewindow.style.borderStyle = 'none'
    creativewindow.style.top = '0px'
    creativewindow.style.left = '0px'
    creativewindow.style.right = '0px'
    creativewindow.style.bottom = '0px'
    creativewindow.style.position = 'absolute'
    creativewindow.style.clear = 'both'
  
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

    var container = fenix.Config.Container
    if (window.frameElement) {
        // inside of a gpt container
        container = window.frameElement
    } else {
        container.parentNode.style.overflow = 'hidden'
        container.parentNode.style.position = 'fixed'
    }

    closeButton.addEventListener('click', function () {
        if (!fenix.Config.MRAID) {
          fenix.Config.Container.parentNode.style.overflow = ''
          fenix.Config.Container.parentNode.style.position = ''
          fenix.Config.Container.innerHTML = '<!-- Interstitial was closed -->'
          container.style.display = 'none'
          fenix.Aux.stop()
        } else mraid.close()
    
        this.Calls.m('close')
    }.bind(this))
  
    container.style.textAlign = 'center'
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
    if (!fenix.Config.MRAID) container.style.position = 'fixed'
    else container.style.position = 'absolute'
    container.style.top = '0px'
    container.style.left = '0px'
    container.style.right = '0px'
    container.style.bottom = '0px'
    container.style.overflow = 'hidden'
    container.style.height = '100%'
    container.style.width = '100%'
    container.style.zIndex = '2147483647'
  
    fenix.Config.Container.appendChild(closeButton)
    fenix.Config.Container.appendChild(creativewindow)
  }
  
  this.Render()
  