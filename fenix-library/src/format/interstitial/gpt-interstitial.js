(this.Render = function () {
  var A = document.createElement("iframe");
  this.Config.Assets[0].Path.includes("?")
    ? (A.src = this.Config.Assets[0].Path + "&i=" + this.Config.Session)
    : (A.src = this.Config.Assets[0].Path + "?i=" + this.Config.Session),
    "%" === this.Config.Assets[0].Width.substr(-1)
      ? (A.style.width = this.Config.Assets[0].Width)
      : (A.style.width = parseInt(this.Config.Assets[0].Width) + "px"),
    "%" === this.Config.Assets[0].Height.substr(-1)
      ? (A.style.height = this.Config.Assets[0].Height)
      : (A.style.height = parseInt(this.Config.Assets[0].Height) + "px"),
    (A.style.margin = "auto"),
    (A.style.border = "0"),
    (A.style.borderStyle = "none"),
    (A.style.top = "0px"),
    (A.style.left = "0px"),
    (A.style.right = "0px"),
    (A.style.bottom = "0px"),
    (A.style.position = "absolute"),
    (A.style.clear = "both");
  var e = document.createElement("button");
  (e.id = "closeButton"),
    (e.style.border = "none"),
    (e.style.height = "45px"),
    (e.style.width = "45px"),
    (e.style.position = "fixed"),
    (e.style.right = "0"),
    (e.style.top = "0"),
    (e.style.zIndex = "2147483647"),
    (e.style.background =
      'url("https://media-cdn.synkd.life/closebutton.png") no-repeat center center'),
    (e.style.backgroundSize = "50% 50%");
  var t = fenix.Config.Container;
  window.frameElement
    ? (t = window.frameElement)
    : ((t.parentNode.style.overflow = "hidden"),
      (t.parentNode.style.position = "fixed")),
    e.addEventListener(
      "click",
      function () {
        fenix.Config.MRAID
          ? mraid.close()
          : ((fenix.Config.Container.parentNode.style.overflow = ""),
            (fenix.Config.Container.parentNode.style.position = ""),
            (fenix.Config.Container.innerHTML =
              "\x3c!-- Interstitial was closed --\x3e"),
            (t.style.display = "none"),
            fenix.Aux.stop()),
          this.Calls.m("close");
      }.bind(this)
    ),
    (t.style.textAlign = "center"),
    (t.style.backgroundColor = "rgba(0, 0, 0, 0.5)"),
    fenix.Config.MRAID
      ? (t.style.position = "absolute")
      : (t.style.position = "fixed"),
    (t.style.top = "0px"),
    (t.style.left = "0px"),
    (t.style.right = "0px"),
    (t.style.bottom = "0px"),
    (t.style.overflow = "hidden"),
    (t.style.height = "100%"),
    (t.style.width = "100%"),
    (t.style.zIndex = "2147483647"),
    fenix.Config.Container.appendChild(e),
    fenix.Config.Container.appendChild(A);
}),
  this.Render();
