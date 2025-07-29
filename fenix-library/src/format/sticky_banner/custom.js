// Format specific code for sticky banner on left bottom
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
    creativewindow.style.height = this.Config.Assets[0].Height + 'px'
    creativewindow.style.margin = 'auto'
    creativewindow.style.border = '0'
    creativewindow.style.borderStyle = 'none'
    creativewindow.style.left = '0px!important'
    creativewindow.style.right = '0px'
    creativewindow.style.top = '0px'
    creativewindow.style.clear = 'both'
  
    fenix.Config.Container.style.textAlign = 'center'
    fenix.Config.Container.style.position = 'fixed'
    fenix.Config.Container.style.overflow = 'hidden'
    fenix.Config.Container.style.height = this.Config.Assets[0].Height + 'px'
    fenix.Config.Container.style.width = '100%'
    fenix.Config.Container.style.bottom = '800px'
    fenix.Config.Container.style.left = '-' + this.Config.Assets[0].Height + 'px'
    fenix.Config.Container.style.zIndex = '2147483647'
    fenix.Config.Container.style.transition = 'bottom 0.5s ease-in-out'
  
    fenix.Config.Container.appendChild(creativewindow)
  }
  
  this.Render()
  