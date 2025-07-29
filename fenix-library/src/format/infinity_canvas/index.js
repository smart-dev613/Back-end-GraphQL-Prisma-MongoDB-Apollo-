// Format specific code for infinity canvas
// 'fenix' is available
this.Render = function () {
  var creativewindow = document.createElement('iframe')
  if (this.Config.Assets[0].Path.includes('?')) {
    creativewindow.src = this.Config.Assets[0].Path + '&i=' + this.Config.Session 
  } else {
    creativewindow.src = this.Config.Assets[0].Path + '?i=' + this.Config.Session 
  }
  creativewindow.style.width = this.Config.Assets[0].Width
  creativewindow.style.height = this.Config.Assets[0].Height + 'px'
  creativewindow.style.border = '0'

  fenix.Config.Container.Width = this.Config.Assets[0].Width
  fenix.Config.Container.Height = this.Config.Assets[0].Height

  fenix.Config.Container.appendChild(creativewindow)
}

this.Render()