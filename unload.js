(function () {
  'use strict'

  async function suspend () {
    await browser.runtime.sendMessage({
      type: 'suspend'
    })
  }

  var hideTimeout = null
  function onVisibilityChange () {
    if (document.visibilityState === 'hidden') {
      hideTimeout = setTimeout(suspend, 2000)
    } else if (hideTimeout != null) {
      clearTimeout(hideTimeout)
      hideTimeout = null
    }
  }
  document.addEventListener('visibilitychange', () => onVisibilityChange())
  onVisibilityChange()
})()
