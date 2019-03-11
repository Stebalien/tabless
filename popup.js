/* global browser */

(async function () {
  async function getSuspender () {
    const bg = await browser.runtime.getBackgroundPage()
    return bg.suspender
  }

  document.getElementById('suspend-current').addEventListener('click', async () => {
    const suspender = await getSuspender()
    await suspender.suspendCurrent()
    window.close()
  })

  document.getElementById('suspend-all').addEventListener('click', async () => {
    const suspender = await getSuspender()
    await suspender.suspendAll()
    window.close()
  })

  document.getElementById('resume-all').addEventListener('click', async () => {
    const suspender = await getSuspender()
    await suspender.resumeAll()
    window.close()
  })
})()
