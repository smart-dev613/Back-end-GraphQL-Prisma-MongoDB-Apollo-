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
    topDiv.innerHTML = 'scroll to continue with content <a class="btnLink" style="float: right" href="#"><p class="accStatus" style="float: right;margin-top: -6px;font-size: small;color: white;"></p><p class="ins-close" style="fill: white;width: 30px;float: right;margin-top: -4px"></p></a>'

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
    
    window.frameElement.style.display = 'none'
    var open_svg = '<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="15.929px" height="15.929px" viewBox="0 0 284.929 284.929" style="enable-background:new 0 0 284.929 284.929;" xml:space="preserve"><g><path d="M282.082,76.511l-14.274-14.273c-1.902-1.906-4.093-2.856-6.57-2.856c-2.471,0-4.661,0.95-6.563,2.856L142.466,174.441L30.262,62.241c-1.903-1.906-4.093-2.856-6.567-2.856c-2.475,0-4.665,0.95-6.567,2.856L2.856,76.515C0.95,78.417,0,80.607,0,83.082c0,2.473,0.953,4.663,2.856,6.565l133.043,133.046c1.902,1.903,4.093,2.854,6.567,2.854s4.661-0.951,6.562-2.854L282.082,89.647c1.902-1.903,2.847-4.093,2.847-6.565C284.929,80.607,283.984,78.417,282.082,76.511z"/></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg>'
    var close_svg = '<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="15.929px" height="15.929px" viewBox="0 0 240.823 240.823" style="enable-background:new 0 0 240.823 240.823;" xml:space="preserve"><g><path id="Chevron_Right_1_" d="M183.189,111.816L74.892,3.555c-4.752-4.74-12.451-4.74-17.215,0c-4.752,4.74-4.752,12.439,0,17.179l99.707,99.671l-99.695,99.671c-4.752,4.74-4.752,12.439,0,17.191c4.752,4.74,12.463,4.74,17.215,0l108.297-108.261C187.881,124.315,187.881,116.495,183.189,111.816z"/><g></g><g></g><g></g><g></g><g></g><g></g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g><g></g></svg>'
    window.frameElement.parentNode.insertBefore(topDiv, window.frameElement.parentNode.firstChild)
    window.frameElement.parentNode.appendChild(bottomDiv)

	var buttonLink = topDiv.getElementsByClassName('btnLink')[0]
    var closeBtn = topDiv.getElementsByClassName('ins-close')[0]
    closeBtn.innerHTML = close_svg;
    var statusTxt = topDiv.getElementsByClassName("accStatus")[0]
	statusTxt.innerHTML = "open"
	
    buttonLink.addEventListener('click', function () {
      if (window.frameElement.style.display == 'none') {
        window.frameElement.style.display = 'block';
        closeBtn.innerHTML = open_svg;
        statusTxt.innerHTML = "close"
      } else {
        window.frameElement.style.display = 'none'
        closeBtn.innerHTML = close_svg;
        statusTxt.innerHTML = "open"

      }
    })
  }
}

this.Render()
this.AppendBanners()