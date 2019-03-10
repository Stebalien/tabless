/* global document, window, browser */

(function () {
  'use strict'

  const idleTimeout = 60 * 60 * 1000

  async function suspend () {
    await browser.runtime.sendMessage({
      type: 'suspend'
    })
  }

  var hideTimeout = null
  function onVisibilityChange () {
    if (document.visibilityState === 'hidden') {
      hideTimeout = setTimeout(suspend, idleTimeout)
    } else if (hideTimeout != null) {
      clearTimeout(hideTimeout)
      hideTimeout = null
    }
  }
  document.addEventListener('visibilitychange', () => onVisibilityChange())
  onVisibilityChange()
})()
