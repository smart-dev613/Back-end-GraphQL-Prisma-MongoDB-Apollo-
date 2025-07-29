onFenixReady(function () {
  firstScrollContainerBottom() // set up scroll listener to show banner

  document.getElementById('close').addEventListener('click', function () {
    hideContainerByBottom()
  })
})
