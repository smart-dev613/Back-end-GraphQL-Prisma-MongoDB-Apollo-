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
    creativewindow.style.maxWidth = '100%'
    fenix.Config.Container.style.textAlign = 'center'
    fenix.Config.Container.appendChild(creativewindow)
  }
  
  this.AppendBanners = function () {
      console.log('window.frameElement', window.frameElement)
    if (window.frameElement) {
      var topDiv = document.createElement('div')
      var bottomDiv = document.createElement('div')
  
      //Initial Advertisement Bar
      topDiv.style.background = 'rgb(0, 0, 0)'
      topDiv.style.color = 'rgb(255, 255, 255)'
      
      topDiv.style.width = 'auto'
      topDiv.style.margin = '0px'
      topDiv.style.padding = '18px'
      topDiv.style.textAlign = 'center'
      topDiv.style.font = '10px/10px Helvetica, Arial, sans-serif'
      topDiv.style.boxShadow = 'black 0px -1px 10px'
      topDiv.innerHTML = 'scroll to continue with content <span class="ins-close" style="fill: white;width: 30px;float: right;margin-top: -10px"></span>'
      topDiv.style.textTransform = 'uppercase'
      topDiv.style.zIndex = '4'
      topDiv.style.fontSize = '13px'
  
      bottomDiv.style.background = 'rgb(0, 0, 0)'
      bottomDiv.style.color = 'rgb(255, 255, 255)'
      
      bottomDiv.style.width = 'auto'
      bottomDiv.style.margin = '0px'
      bottomDiv.style.padding = '18px'
      bottomDiv.style.textAlign = 'center'
      bottomDiv.style.font = '10px/10px Helvetica, Arial, sans-serif'
      bottomDiv.style.boxShadow = 'black 0px -1px 10px'
      bottomDiv.innerText = 'advertisement'
      bottomDiv.style.textTransform = 'uppercase'
      bottomDiv.style.zIndex = '4'
      bottomDiv.style.fontSize = '13px'
      
      window.frameElement.parentNode.insertBefore(topDiv, window.frameElement.parentNode.firstChild)
      
  
      var closeBtn = topDiv.getElementsByClassName('ins-close')[0]
      closeBtn.innerHTML = '<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 475.2 475.2" style="enable-background:new 0 0 475.2 475.2;" xml:space="preserve"><g><g><path d="M405.6,69.6C360.7,24.7,301.1,0,237.6,0s-123.1,24.7-168,69.6S0,174.1,0,237.6s24.7,123.1,69.6,168s104.5,69.6,168,69.6s123.1-24.7,168-69.6s69.6-104.5,69.6-168S450.5,114.5,405.6,69.6z M386.5,386.5c-39.8,39.8-92.7,61.7-148.9,61.7s-109.1-21.9-148.9-61.7c-82.1-82.1-82.1-215.7,0-297.8C128.5,48.9,181.4,27,237.6,27s109.1,21.9,148.9,61.7C468.6,170.8,468.6,304.4,386.5,386.5z"/><path d="M342.3,132.9c-5.3-5.3-13.8-5.3-19.1,0l-85.6,85.6L152,132.9c-5.3-5.3-13.8-5.3-19.1,0c-5.3,5.3-5.3,13.8,0,19.1l85.6,85.6l-85.6,85.6c-5.3,5.3-5.3,13.8,0,19.1c2.6,2.6,6.1,4,9.5,4s6.9-1.3,9.5-4l85.6-85.6l85.6,85.6c2.6,2.6,6.1,4,9.5,4c3.5,0,6.9-1.3,9.5-4c5.3-5.3,5.3-13.8,0-19.1l-85.4-85.6l85.6-85.6C347.6,146.7,347.6,138.2,342.3,132.9z"/></g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg>'
  
      closeBtn.addEventListener('click', function () {
        window.frameElement.style.display = 'none'
        topDiv.style.display = 'none'
        bottomDiv.style.display = 'none'
      })
    }
  }
  
  this.Render()
  this.AppendBanners()