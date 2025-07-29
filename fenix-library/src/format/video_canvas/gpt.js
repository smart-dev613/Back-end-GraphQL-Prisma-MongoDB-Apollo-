// Format specific code for Video Canvases
// 'fenix' is available
this.Render = function () {
    var creativewindow = document.createElement('iframe')
    if (this.Config.Assets[0].Path.includes('?')) {
      creativewindow.src = this.Config.Assets[0].Path + '&i=' + this.Config.Session 
    } else {
      creativewindow.src = this.Config.Assets[0].Path + '?i=' + this.Config.Session 
    }
  
    if (this.Config.Assets[0].Width.includes('%')) creativewindow.style.width = this.Config.Assets[0].Width
    else creativewindow.style.width = parseInt(this.Config.Assets[0].Width) + 'px'
  
    if (this.Config.Assets[0].Height.includes('%')) creativewindow.style.height = this.Config.Assets[0].Height
    else creativewindow.style.height = parseInt(this.Config.Assets[0].Height) + 'px'
    
    //for gpt formats
    var container = fenix.Config.Container
    if (window.frameElement) {
        // inside of a gpt container
        container = window.frameElement
    } else {
    container.parentNode.style.overflow = 'hidden'
    container.parentNode.style.position = 'fixed'
    }

    creativewindow.style.border = '0'
    creativewindow.style.maxWidth = '100%'
    fenix.Config.Container.style.textAlign = 'center'
    fenix.Config.Container.appendChild(creativewindow)
  }
  
  this.Render()