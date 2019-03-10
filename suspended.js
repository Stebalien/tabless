/* global document, window, browser, URLSearchParams */

(function () {
  'use strict'

  const params = new URLSearchParams(window.location.hash.slice(1))

  document.title = params.get('title')
  const screenshot = params.get('screenshot')
  if (screenshot) {
    document.getElementById('screenshot').src = screenshot
  }

  function resume () {
    browser.runtime.sendMessage({
      type: 'resume'
    })
  }

  var showTimeout = null
  function onVisibilityChange () {
    if (document.visibilityState === 'visible') {
      showTimeout = setTimeout(resume, 3000)
    } else if (showTimeout != null) {
      clearTimeout(showTimeout)
      showTimeout = null
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  if (document.visibilityState === 'visible') {
    onVisibilityChange()
  }

  document.body.addEventListener('click', resume)
})()
