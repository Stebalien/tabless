/* global document, window, browser */
'use strict'

async function resume () {
  await browser.runtime.sendMessage({
    type: 'resume'
  })
}

document.body.addEventListener('click', () => resume())

function setState(state) {
  document.title = `${state.title} [z]`
  if (state.screenshot) {
    document.getElementById('screenshot').src = state.screenshot
  }
  return true
}
