// Format specific code for expandables-resize
this.Render = function () {
  var creativewindow = document.createElement('iframe')
  var primaryContainer = document.createElement('div')

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
  primaryContainer.style.height = creativeHeight
  primaryContainer.style.width = creativeWidth

  primaryContainer.style.top = '0'
  primaryContainer.style.left = '0'
  primaryContainer.style.position = 'absolute'

  creativewindow.style.border = '0'
  creativewindow.style.maxWidth = '100%'

  fenix.Config.Container.appendChild(creativewindow)
  fenix.Config.Container.appendChild(primaryContainer)

  this.Aux.openSecondary = function () {

    console.log('resize secondary')
    var resizedContainer = document.createElement('div')
    resizedContainer.id = this.Config.Container.id + '-int'

    var secondarycreativewindow = document.createElement('iframe')
    if (this.Config.Assets[1].Path.includes('?')) {
      creativewindow.src = this.Config.Assets[1].Path + '&i=' + this.Config.Session
    } else {
      creativewindow.src = this.Config.Assets[1].Path + '?i=' + this.Config.Session
    }

    var secondarycreativeWidth = null
    var secondarycreativeHeight = null
    
    if (this.Config.Assets[1].Width.substr(-1) === '%') secondarycreativeWidth = this.Config.Assets[1].Width
    else secondarycreativeWidth = parseInt(this.Config.Assets[1].Width) + 'px'
    if (this.Config.Assets[1].Height.substr(-1) === '%') secondarycreativeHeight = this.Config.Assets[1].Height
    else secondarycreativeHeight = parseInt(this.Config.Assets[1].Height) + 'px'

    secondarycreativewindow.style.height = secondarycreativeHeight
    secondarycreativewindow.style.width = secondarycreativeWidth
    resizedContainer.style.height = secondarycreativeHeight
    resizedContainer.style.width = secondarycreativeWidth

    resizedContainer.style.top = '0'
    resizedContainer.style.left = '0'
    resizedContainer.style.position = 'absolute'


    secondarycreativewindow.style.border = '0'
    resizedContainer.addEventListener('click', function () {
    console.log('secondary heighnt..',secondarycreativeHeight)
    console.log('secondary width..',secondarycreativeWidth)
     })
    if (!fenix.Config.MRAID) resizedContainer.style.position = 'fixed'
    else resizedContainer.style.position = 'absolute'


    var closeButton = document.createElement('button')
    closeButton.id = 'closeButton'
    closeButton.style.border = 'none'
    closeButton.style.height = '45px'
    closeButton.style.width = '45px'
    closeButton.style.position = 'fixed'
    closeButton.style.right = '0'
    closeButton.style.top = '0'
    closeButton.style.zIndex = '2147483647'
    closeButton.style.backgroundColor = 'black'
    closeButton.style.background = 'url(\"https://media-cdn.synkd.life/closebutton.png\") no-repeat center center'
    closeButton.style.backgroundSize = '50% 50%'
    closeButton.addEventListener('click', function () {
      resizedContainer.remove()
      console.log("close button clicked.. ")
    }.bind(this))

    resizedContainer.appendChild(closeButton)
    resizedContainer.appendChild(secondarycreativewindow)
    fenix.Config.Container.appendChild(resizedContainer)
    

  }.bind(this)

  primaryContainer.addEventListener('click', function () {
    console.log('container clicked and removed')
    fenix.Aux.openSecondary()
    primaryContainer.remove()

  })
}

this.Render()
