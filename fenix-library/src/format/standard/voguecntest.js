// Format specific code for in-contents
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
    
    creativewindow.style.border = '0'
    fenix.Config.Container.appendChild(creativewindow)
  }
  
  // VOGUE CN FIX
  this.Fix = function () {
    this.Config.Container.parentNode.setAttribute('style', 'display: block;')
  }.bind(this)
  
  this.Render()
  this.Fix()