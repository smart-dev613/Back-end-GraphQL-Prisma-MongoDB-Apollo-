// Format specific code for interstitials // 'fenix' is available
this.Render = function() {
    var creativewindow = document.createElement('iframe');
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
    closeButton.style.height = '100px'
    closeButton.style.width = '100px'
    closeButton.style.position = 'fixed'
    closeButton.style.right = '0'
    closeButton.style.top = '0'
    closeButton.style.zIndex = '2147483647'
    closeButton.style.backgroundSize = '50% 50%'
    closeButton.style.background = 'url("https://media-cdn.synkd.life/closebutton.png") center center / 50% 50% no-repeat'
    closeButton.addEventListener('click', function() {
        var interstitial = window.parent.document.getElementById('inspired-Interstitial');
        if (interstitial) {
            interstitial.parentNode.removeChild(interstitial)
        }
        if (!fenix.Config.MRAID) {
            fenix.Config.Container.parentNode.style.overflow = ''
            fenix.Config.Container.parentNode.style.position = ''
            fenix.Config.Container.innerHTML = '<!-- Interstitial was closed -->'
            fenix.Config.Container.style.display = 'none'
            fenix.Aux.stop()
        } else mraid.close() 
this.Calls.m('close')
    }.bind(this))
    function myFunction(x) {
        if (x.matches) {
            document.body.style.display = 'none';
        } else {
            document.body.style.display = 'block';
        }
    }
    var x = window.matchMedia('(max-width: 750px)')
    myFunction(x)
    x.addListener(myFunction)
    fenix.Config.Container.style.textAlign = 'center'
    fenix.Config.Container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
    if (!fenix.Config.MRAID) fenix.Config.Container.style.position = 'fixed'
    else fenix.Config.Container.style.position = 'absolute'
    fenix.Config.Container.style.top = '0px'
    fenix.Config.Container.style.left = '0px'
    fenix.Config.Container.style.right = '0px'
    fenix.Config.Container.style.bottom = '0px'
    fenix.Config.Container.style.overflow = 'hidden'
    fenix.Config.Container.style.height = '100%'
    fenix.Config.Container.style.width = '100%'
    fenix.Config.Container.style.zIndex = '2147483647'
    fenix.Config.Container.parentNode.style.overflow = 'hidden'
    fenix.Config.Container.parentNode.style.position = 'fixed'
    fenix.Config.Container.appendChild(closeButton) 
fenix.Config.Container.appendChild(creativewindow);
      
    const div = document.createElement('div');
    div.setAttribute('id', 'inspired-Interstitial');
    div.style.top = '0px'
    div.style.left = '0px'
    div.style.overflow = 'hidden'
    div.style.backgroundColor = 'rgba(0,0,0,0.5)'
    div.style.height = '100vh'
    div.style.width = '100vw'
    div.style.zIndex = '2147483647'
    div.style.overflow = 'hidden'
    div.style.position = 'fixed'
    div.appendChild(closeButton);
    div.appendChild(creativewindow);
    window.parent.document.body.insertBefore(div, window.parent.document.body.firstChild);
}
this.Render()