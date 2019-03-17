/* global document, window, browser */

(async () => {
  'use strict'

  async function resume () {
    await browser.runtime.sendMessage({
      type: 'resume'
    })
  }

  function setState (state) {
    document.title = `${state.title} [z]`
    if (state.screenshot) {
      document.getElementById('screenshot').src = state.screenshot
    }
  }

  document.body.addEventListener('click', () => resume())

  setState(await browser.runtime.sendMessage({type: 'get_state'}))
  await browser.runtime.sendMessage({type: 'finish_suspend'})
})()
