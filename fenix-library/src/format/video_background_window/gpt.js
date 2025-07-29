// Format specific code for video background windows
// 'fenix' is available
this.Render = function () {
  var creativewindow = document.createElement('iframe')
    if (this.Config.Assets[0].Path.includes('?')) {
    creativewindow.src = this.Config.Assets[0].Path + '&i=' + this.Config.Session 
  } else {
    creativewindow.src = this.Config.Assets[0].Path + '?i=' + this.Config.Session 
  }

  //for gpt formats
var container = fenix.Config.Container
if (window.frameElement) {
    // inside of a gpt container
    container = window.frameElement
} else {
    container.parentNode.style.overflow = 'hidden'
    container.parentNode.style.position = 'fixed'
}
  creativewindow.style.width = this.Config.Assets[0].Width + 'px'
  creativewindow.style.height = this.Config.Assets[0].Height + 'px'
  creativewindow.style.border = '0'
  fenix.Config.Container.appendChild(creativewindow)
}

this.Render()