// Format specific code for interscroller
// 'fenix' is available
this.Render = function () {
    // Container
    var iframeContainer = document.createElement('div');
    iframeContainer.style.height = 'calc(100vh - 60px)';
    iframeContainer.style.width = '100%';
    iframeContainer.style.overflow = 'hidden!important';
    iframeContainer.style.setProperty('overflow', 'hidden', 'important');
    iframeContainer.style.setProperty('position', 'relative', 'important');
    iframeContainer.style.setProperty('box-sizing', 'inherit');
    iframeContainer.style.setProperty('transition', '0.3s');
    
    // Second Container Clip
    var iframeClipContainer = document.createElement('div');
    iframeClipContainer.style.setProperty('position', 'absolute', 'important');
    iframeClipContainer.style.setProperty('top', '0', 'important');
    iframeClipContainer.style.setProperty('left', '0', 'important');
    iframeClipContainer.style.setProperty('width', '100%', 'important');
    iframeClipContainer.style.setProperty('height', '100%', 'important');
    iframeClipContainer.style.setProperty('border', '0', 'important');
    iframeClipContainer.style.setProperty('margin', '0', 'important');
    iframeClipContainer.style.setProperty('padding', '0', 'important');
    iframeClipContainer.style.setProperty('clip', 'rect(0,auto,auto,0)', 'important');
    // Thrid Container Flex
    var iframeFlexContainer = document.createElement('div');
    
    iframeFlexContainer.style.setProperty('width', '100%');
    iframeFlexContainer.style.setProperty('height', '100%');
    iframeFlexContainer.style.setProperty('display', '-webkit-box');
    iframeFlexContainer.style.setProperty('-webkit-box-orient', 'vertical');
    iframeFlexContainer.style.setProperty('-webkit-box-direction', 'normal');
    iframeFlexContainer.style.setProperty('flex-direction', 'column');
    iframeFlexContainer.style.setProperty('align-items', 'center');
    iframeFlexContainer.style.setProperty('-webkit-box-pack', 'center');
    iframeFlexContainer.style.setProperty('justify-content', 'center');
    iframeFlexContainer.style.setProperty('margin-top', '25px');
    iframeFlexContainer.style.setProperty('text-align', 'center');
    iframeFlexContainer.style.setProperty('position', 'fixed', 'important');
    iframeFlexContainer.style.setProperty('top', '0px', 'important');
    iframeFlexContainer.style.setProperty('transform', 'translateZ(0px)', 'important');
    
    // Iframe
    var iframeElement = document.createElement('iframe');
    iframeElement.setAttribute('scrolling', 'no');
    iframeElement.style.setProperty('position', 'fixed');
    iframeElement.style.height = 'calc(100vh - 60px)';
    iframeElement.style.width = '100%';
    
    if (this.Config.Assets[0].Path.includes('?')) {
      iframeElement.src = this.Config.Assets[0].Path + '&i=' + this.Config.Session 
    } else {
      iframeElement.src = this.Config.Assets[0].Path + '?i=' + this.Config.Session 
    }
    
    // Header
    var headerContainer = document.createElement('div');
    headerContainer.style.setProperty('height', '30px');
    headerContainer.style.setProperty('width', '100%');
    headerContainer.style.setProperty('display', 'flex');
    headerContainer.style.setProperty('justify-content', 'center');
    headerContainer.style.setProperty('align-items', 'center');
    headerContainer.style.setProperty('background', 'black');
    headerContainer.style.setProperty('color', 'white');
    headerContainer.style.setProperty('position', 'relative');
    
    var headerText = document.createElement('div');
    headerText.style.setProperty('color', 'white');
    headerText.innerHTML = 'Advertisment';
    
    // Dropdown Icon
    var dropdownContainer = document.createElement('div');
    dropdownContainer.style.setProperty('position', 'absolute');
    dropdownContainer.style.setProperty('right', '0px');
    dropdownContainer.style.setProperty('height', '30px');
    dropdownContainer.style.setProperty('width', '30px');
    dropdownContainer.style.setProperty('cursor', 'pointer');
    dropdownContainer.style.setProperty('display', 'flex');
    dropdownContainer.style.setProperty('justify-content', 'center');
    dropdownContainer.style.setProperty('align-items', 'center');
    
    var dropdownIconLeft = document.createElement('div');
    dropdownIconLeft.style.setProperty('content', ' ');
    dropdownIconLeft.style.setProperty('width', '10px');
    dropdownIconLeft.style.setProperty('height', '5px');
    dropdownIconLeft.style.setProperty('position', 'relative');
    dropdownIconLeft.style.setProperty('transition', '0.3s');
    dropdownIconLeft.style.setProperty('border-radius', '20px');
    dropdownIconLeft.style.setProperty('background', 'white');
    dropdownIconLeft.style.setProperty('left', '3px');
    dropdownIconLeft.style.setProperty('transform', 'rotate(45deg)');
    
    var dropdownIconRight = document.createElement('div');
    dropdownIconRight.style.setProperty('content', ' ');
    dropdownIconRight.style.setProperty('width', '10px');
    dropdownIconRight.style.setProperty('height', '5px');
    dropdownIconRight.style.setProperty('position', 'relative');
    dropdownIconRight.style.setProperty('transition', '0.3s');
    dropdownIconRight.style.setProperty('border-radius', '20px');
    dropdownIconRight.style.setProperty('background', 'white');
    dropdownIconRight.style.setProperty('left', '-3px');
    dropdownIconRight.style.setProperty('transform', 'rotate(-45deg)');
    
    dropdownContainer.appendChild(dropdownIconLeft);
    dropdownContainer.appendChild(dropdownIconRight);
    
    headerContainer.appendChild(headerText);
    headerContainer.appendChild(dropdownContainer);
    
    // Footer
    var footerContainer = document.createElement('div');
    footerContainer.style.setProperty('height', '30px');
    footerContainer.style.setProperty('width', '100%');
    footerContainer.style.setProperty('display', 'flex');
    footerContainer.style.setProperty('justify-content', 'center');
    footerContainer.style.setProperty('align-items', 'center');
    footerContainer.style.setProperty('background', 'black');
    footerContainer.style.setProperty('color', 'white');
    footerContainer.style.setProperty('position', 'relative');
    
    var footerText = document.createElement('div');
    footerText.style.setProperty('color', 'white');
    footerText.innerHTML = 'Powered by Synkd';
    
    footerContainer.appendChild(footerText);
    
    // PARENT
    fenix.Config.Container.style.height = 'calc(100vh + 1px)'
    fenix.Config.Container.style.width = '100%'
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
      window.frameElement.style.height = '100vh'
      window.frameElement.style.border = '0px'
      window.frameElement.style.position = 'absolute'
      window.frameElement.style.top = 'auto'
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
    
    iframeFlexContainer.appendChild(iframeElement);
    iframeClipContainer.appendChild(iframeFlexContainer);
    iframeContainer.appendChild(iframeClipContainer);
    
    fenix.Config.Container.appendChild(headerContainer);
    fenix.Config.Container.appendChild(iframeContainer);
    fenix.Config.Container.appendChild(footerContainer);
    
    dropdownContainer.addEventListener('click', function () {
      dropdownContainer.classList.toggle('close');
      if (dropdownContainer.classList.contains('close')) {
        dropdownIconLeft.style.setProperty('transform', 'rotate(-45deg)');
        dropdownIconRight.style.setProperty('transform', 'rotate(45deg)');
        iframeContainer.style.height = '0';
        fenix.Config.Container.style.height = '0';
        if (window.frameElement) {
          window.frameElement.parentNode.style.height = '0'
        }
      } else {
        dropdownIconLeft.style.setProperty('transform', 'rotate(45deg)');
        dropdownIconRight.style.setProperty('transform', 'rotate(-45deg)');
        iframeContainer.style.height = '100vh';
        fenix.Config.Container.style.height = 'calc(100vh + 1px)';
        if (window.frameElement) {
          window.frameElement.parentNode.style.height = 'calc(100vh + 1px)'
        }
      }
    });
  }
  this.Fix = function () {
    if (window.frameElement) {
      window.frameElement.parentNode.style.zIndex = '-1'
      window.frameElement.style.zIndex = '-1'
    }
  }
  this.Render()
  this.Fix()