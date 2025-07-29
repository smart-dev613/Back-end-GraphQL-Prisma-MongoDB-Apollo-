// Format specific code for expandable_Sticky_overlays
// swipe up version
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
    primaryOverlay.style.right = '0'
    primaryOverlay.style.position = 'absolute'
    creativewindow.style.border = '0'
    creativewindow.style.maxWidth = '100%'
    fenix.Config.Container.style.textAlign = 'center'
    fenix.Config.Container.style.position = 'fixed'
    fenix.Config.Container.style.overflow = 'hidden'
    fenix.Config.Container.style.bottom = '0'
    fenix.Config.Container.style.left = '0'
    fenix.Config.Container.style.zIndex = '2147483647'
    if(window.frameElement){
    window.frameElement.style.position = 'fixed'
    window.frameElement.style.zIndex = '2147483647'
    window.frameElement.style.width = '100%'
    window.frameElement.style.height = creativeHeight
    window.frameElement.style.bottom = '0'
    }
    // close button1
    var closeButton1 = document.createElement('button')
    closeButton1.id = 'closeButton1'
    closeButton1.style.border = 'none'
    closeButton1.style.height = '50px'
    closeButton1.style.width = '50px'
    closeButton1.style.position = 'fixed'
    closeButton1.style.right = '0'
    closeButton1.style.bottom = '200px'
    closeButton1.style.zIndex = '2147483647'
    closeButton1.style.background = 'url(\"https://media-cdn.synkd.life/close_circle.png\") no-repeat center center'
    closeButton1.style.backgroundSize = '50% 50%'
    fenix.Config.Container.appendChild(creativewindow)
    fenix.Config.Container.appendChild(primaryOverlay)
    primaryOverlay.appendChild(closeButton1)
    closeButton1.addEventListener('click', function () {
    if (!fenix.Config.MRAID) {
    fenix.Config.Container.parentNode.style.overflow = ''
    fenix.Config.Container.parentNode.style.position = ''
    fenix.Config.Container.innerHTML = '<!-- Ad was closed -->'
    if(window.frameElement){
    var container = window.frameElement
    }else{var container = fenix.Config.Container
    }
    container.style.display = 'none'
    fenix.Aux.stop()
    } else mraid.close()
    this.Calls.m('close')
    }.bind(this))
    this.Aux.openSecondary = function () {
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
    // close button
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
    // remove bigger ad if close button is clicked
    console.log('open small container')
    fenix.Config.Container.appendChild(creativewindow)
    console.log('close button')
    secondaryContainer.remove()
    if(window.frameElement){
    window.frameElement.style.height = '275px'
    }
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
    secondaryContainer.appendChild(closeButton)
    secondaryContainer.appendChild(secondarywindow)
    }.bind(this)
    let touchstartY = 0
    let touchendY = 0
    function checkDirection() {
    if (touchendY< touchstartY){
    // loading the bigger container and removing small container
    fenix.Aux.openSecondary()
    if (window.frameElement) {
    window.frameElement.style.height = '100%'
    }
    console.log('swipe sticky ,,, close small container')
    creativewindow.remove()}
    }
    primaryOverlay.addEventListener('touchstart', e => { touchstartY = e.changedTouches[0].screenY })
    primaryOverlay.addEventListener('touchend', e => { touchendY = e.changedTouches[0].screenY
    checkDirection() })
    }
    this.Render()