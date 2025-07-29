(this.Render = function () {
  var e = document.createElement("iframe");
  (e.src =
    this.Config.Assets[0].Path +
    (this.Config.Assets[0].Path.includes("?") ? "&i=" : "?i=") +
    this.Config.Session),
    (e.style.width = "100vw"),
    (e.style.height = "100vh"),
    (e.style.border = "0px"),
    (e.style.position = "fixed"),
    (e.style.top = "auto"),
    (e.style.left = "0px"),
    (e.style.margin = "0px"),
    (e.style.padding = "0px"),
    (e.style.bottom = "0px"),
    (e.style.transform = "translateZ(0px)"),
    (fenix.Config.Container.style.height = "1200px"),
    (fenix.Config.Container.style.width = "100%"),
    (fenix.Config.Container.style.position = "relative");
  var t = document.createElement("div");
  (t.style.height = "100%"),
    (t.style.flexDirection = "column"),
    (t.style.position = "absolute"),
    (t.style.top = "0"),
    (t.style.width = "100%"),
    (t.style.display = "flex");
  var n = document.createElement("div");
  (n.style.position = "relative"), (n.style.flex = "1 1 auto");
  var i = document.createElement("div");
  (i.style.position = "absolute"),
    (i.style.clip = "rect(auto,auto,auto,auto)"),
    (i.style.top = "0"),
    (i.style.left = "0"),
    (i.style.width = "100%"),
    (i.style.height = "100%"),
    window.frameElement &&
      ((window.frameElement.parentNode.style.height = "calc(100vh + 1px)"),
      (window.frameElement.parentNode.style.width = "100vw"),
      (window.frameElement.parentNode.style.top = "0px"),
      (window.frameElement.parentNode.style.left = "0px"),
      (window.frameElement.parentNode.style.margin = "0px"),
      (window.frameElement.parentNode.style.padding = "0px"),
      (window.frameElement.parentNode.style.overflow = "hidden"),
      (window.frameElement.parentNode.style.clipPath = "inset(0px)"),
      window.frameElement.parentNode.style.setProperty(
        "-webkit-clip-path",
        "inset(0px)"
      ),
      (window.frameElement.parentNode.style.clip =
        "rect(0px, auto, auto, 0px)"),
      window.frameElement.parentNode.style.setProperty(
        "-webkit-clip",
        "rect(0px, auto, auto, 0px)"
      ),
      (window.frameElement.style.transform = "scale(1)"),
      (window.frameElement.style.width = "100vw"),
      (window.frameElement.style.height = "100vh"),
      (window.frameElement.style.border = "0px"),
      (window.frameElement.style.position = "absolute"),
      (window.frameElement.style.top = "auto"),
      (window.frameElement.style.left = "0px"),
      (window.frameElement.style.margin = "0px"),
      (window.frameElement.style.padding = "0px"),
      (window.frameElement.style.bottom = "0px"),
      (window.frameElement.style.transform = "translateZ(0px)"),
      window.top.document.addEventListener("scroll", function (e) {
        window.frameElement.parentNode.getBoundingClientRect().top -
          window.frameElement.parentNode.getBoundingClientRect().height <
        0
          ? (window.frameElement.style.position = "fixed")
          : (window.frameElement.style.position = "absolute");
      })),
    fenix.Config.Container.appendChild(t)
      .appendChild(n)
      .appendChild(i)
      .appendChild(e);
}),
  (this.Fix = function () {
    window.frameElement &&
      ((window.frameElement.parentNode.style.zIndex = "-1"),
      (window.frameElement.style.zIndex = "-1"));
  }),
  this.Render(),
  this.Fix();
