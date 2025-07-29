// Format specific code for interscroller
// 'fenix' is available
this.Render = function () {
    var creativewindow = document.createElement('iframe')
    if (this.Config.Assets[0].Path.includes('?')) {
      creativewindow.src = this.Config.Assets[0].Path + '&i=' + this.Config.Session 
    } else {
      creativewindow.src = this.Config.Assets[0].Path + '?i=' + this.Config.Session 
    }
    // CHILD
    creativewindow.style.width = '100vw'
    creativewindow.style.height = '100vh'
    creativewindow.style.border = '0px'
    creativewindow.style.position = 'fixed'
    creativewindow.style.top = 'auto'
    creativewindow.style.left = '0px'
    creativewindow.style.margin = '0px'
    creativewindow.style.padding = '0px'
    creativewindow.style.bottom = '0px'
    creativewindow.style.transform = 'translateZ(0px)'
  
    // PARENT
    fenix.Config.Container.style.height = 'calc(100vh + 1px)'
    fenix.Config.Container.style.width = '100vw'
    fenix.Config.Container.style.top = '0px'
    fenix.Config.Container.style.left = '0px'
    fenix.Config.Container.style.margin = '0px'
    fenix.Config.Container.style.padding = '0px'
    fenix.Config.Container.style.overflow = 'hidden'
    fenix.Config.Container.style.clipPath = 'inset(0px)'
    fenix.Config.Container.style.setProperty('-webkit-clip-path', 'inset(0px)')
    fenix.Config.Container.style.clip = 'rect(0px, auto, auto, 0px)'
    fenix.Config.Container.style.setProperty('-webkit-clip', 'rect(0px, auto, auto, 0px)')
  
    if (window.frameElement) {
      // PARENT
      window.frameElement.parentNode.style.height = 'calc(100vh + 1px)'
      window.frameElement.parentNode.style.width = '100%'
      window.frameElement.parentNode.style.top = '0px'
      window.frameElement.parentNode.style.left = '0px'
      window.frameElement.parentNode.style.margin = '0px'
      window.frameElement.parentNode.style.padding = '0px'
      window.frameElement.parentNode.style.overflow = 'hidden'
      window.frameElement.parentNode.style.clipPath = 'inset(0px)'
      window.frameElement.parentNode.style.setProperty('-webkit-clip-path', 'inset(0px)')
      window.frameElement.parentNode.style.clip = 'rect(0px, auto, auto, 0px)'
      window.frameElement.parentNode.style.setProperty('-webkit-clip', 'rect(0px, auto, auto, 0px)')
      
      // CHILD
      window.frameElement.style.transform = 'scale(1)'
      window.frameElement.style.width = '100%'
      window.frameElement.style.height = 'calc(100vh - 134px)'
      window.frameElement.style.border = '0px'
      window.frameElement.style.position = 'absolute'
      window.frameElement.style.top = '84px'
      window.frameElement.style.left = '0px'
      window.frameElement.style.margin = '0px'
      window.frameElement.style.padding = '0px'
      window.frameElement.style.bottom = '0px'
      window.frameElement.style.transform = 'translateZ(0px)'
  
      window.top.document.addEventListener('scroll', function (e) {
        if ((window.frameElement.parentNode.getBoundingClientRect().top - window.frameElement.parentNode.getBoundingClientRect().height) < 0) {
          window.frameElement.style.position = 'fixed'
        } else {
          window.frameElement.style.position = 'absolute'
        }
      })
    }
  
    fenix.Config.Container.appendChild(creativewindow)
  }
  
  this.Fix = function () {
    if (window.frameElement) {
      window.frameElement.parentNode.parentNode.parentNode.style.width = '100%'
      window.frameElement.parentNode.parentNode.style.width = '100%'
      window.frameElement.parentNode.style.zIndex = '-1'
      window.frameElement.style.zIndex = '-1'
    }
  }
  
  this.AppendBanners = function () {
    if (window.frameElement) {
      var advertisementDiv = document.createElement('div')
      var scrollToContentDiv = document.createElement('div')
      //Initial Advertisement Bar
      advertisementDiv.style.background = 'rgb(0, 0, 0)'
      advertisementDiv.style.color = 'rgb(255, 255, 255)'
      advertisementDiv.style.position = 'absolute'
      advertisementDiv.style.top = '0px'
      advertisementDiv.style.left = '0px'
      advertisementDiv.style.right = '0px'
      advertisementDiv.style.width = 'auto'
      advertisementDiv.style.margin = '0px'
      advertisementDiv.style.padding = '5px'
      advertisementDiv.style.textAlign = 'center'
      advertisementDiv.style.font = '10px/10px Helvetica, Arial, sans-serif'
      advertisementDiv.style.boxShadow = 'black 0px -1px 10px'
      advertisementDiv.innerText = 'advertisement'
      advertisementDiv.style.textTransform = 'uppercase'
      advertisementDiv.style.zIndex = '4'
  
      //Final Scroll Content Bar
      scrollToContentDiv.style.background = 'rgb(0, 0, 0)'
      scrollToContentDiv.style.color = 'rgb(255, 255, 255)'
      scrollToContentDiv.style.position = 'absolute'
      scrollToContentDiv.style.bottom = '0px'
      scrollToContentDiv.style.left = '0px'
      scrollToContentDiv.style.right = '0px'
      scrollToContentDiv.style.width = '100%'
      scrollToContentDiv.style.margin = '0px'
      scrollToContentDiv.style.padding = '5px'
      scrollToContentDiv.style.textAlign = 'center'
      scrollToContentDiv.style.font = '10px/10px Helvetica, Arial, sans-serif'
      scrollToContentDiv.style.boxShadow = 'black 0px -1px 10px'
      scrollToContentDiv.innerText = 'scroll to continue with content'
      scrollToContentDiv.style.textTransform = 'uppercase'
  
      window.frameElement.parentNode.parentNode.insertBefore(advertisementDiv, window.frameElement.parentNode.parentNode.firstChild)
      window.frameElement.parentNode.parentNode.appendChild(scrollToContentDiv)
    }
  }
  
  this.Render()
  this.Fix()
  this.AppendBanners()