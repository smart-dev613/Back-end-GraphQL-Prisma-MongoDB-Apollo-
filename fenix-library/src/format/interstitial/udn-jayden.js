(this.Render = function () {
  var t = document.createElement("iframe");
  this.Config.Assets[0].Path.includes("?")
    ? (t.src = this.Config.Assets[0].Path + "&i=" + this.Config.Session)
    : (t.src = this.Config.Assets[0].Path + "?i=" + this.Config.Session),
    "%" === this.Config.Assets[0].Width.substr(-1)
      ? (t.style.width = this.Config.Assets[0].Width)
      : (t.style.width = parseInt(this.Config.Assets[0].Width) + "px"),
    "%" === this.Config.Assets[0].Height.substr(-1)
      ? (t.style.height = this.Config.Assets[0].Height)
      : (t.style.height = parseInt(this.Config.Assets[0].Height) + "px"),
    (t.style.margin = "auto"),
    (t.style.border = "0"),
    (t.style.borderStyle = "none"),
    (t.style.top = "0px"),
    (t.style.left = "0px"),
    (t.style.right = "0px"),
    (t.style.bottom = "0px"),
    (t.style.clear = "both"),
    (t.style.position = "unset"),
    (fenix.Config.Container.style.textAlign = "center"),
    (fenix.Config.Container.style.backgroundColor = "rgba(0, 0, 0, 0.5)"),
    (fenix.Config.Container.style.position = "unset"),
    (fenix.Config.Container.style.top = "0px"),
    (fenix.Config.Container.style.left = "0px"),
    (fenix.Config.Container.style.right = "0px"),
    (fenix.Config.Container.style.bottom = "0px"),
    (fenix.Config.Container.style.overflow = "hidden"),
    (fenix.Config.Container.style.height = "100%"),
    (fenix.Config.Container.style.width = "100%"),
    (fenix.Config.Container.style.zIndex = "2147483647"),
    (fenix.Config.Container.parentNode.style.overflow = "hidden"),
    (fenix.Config.Container.parentNode.style.position = "fixed"),
    fenix.Config.Container.appendChild(t);
}),
  this.Render();
