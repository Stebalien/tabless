/* global document, window, browser, URLSearchParams */

(async function () {
  'use strict'

  async function resume () {
    await browser.runtime.sendMessage({
      type: 'resume'
    })
  }

  async function loadImage (el, src) {
    const promise = new Promise((resolve, reject) => {
      el.addEventListener('load', () => resolve(), {once: true})
      el.addEventListener('error', (e) => reject(e), {once: true})
    })
    el.src = src
    return promise
  }

  document.body.addEventListener('click', resume)

  const params = new URLSearchParams(window.location.hash.slice(1))
  document.title = params.get('title')

  const state = await browser.runtime.sendMessage({type: 'suspend_begin'})
  if (state.screenshot) {
    await loadImage(document.getElementById('screenshot'), state.screenshot)
  }

  await browser.runtime.sendMessage({type: 'suspend_complete'})

  /*
  var showTimeout = null
  function onVisibilityChange () {
    if (document.visibilityState === 'visible') {
      showTimeout = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          resume()
        }
      }, 3000)
    } else if (showTimeout != null) {
      clearTimeout(showTimeout)
      showTimeout = null
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  if (document.visibilityState === 'visible') {
    onVisibilityChange()
  }
  */
})()
