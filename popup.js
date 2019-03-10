/* global browser */

(async function () {
  const bg = await browser.runtime.getBackgroundPage()

  document.getElementById('suspend-current').addEventListener('click', async () => {
    await bg.suspendCurrent()
    window.close()
  })

  document.getElementById('suspend-all').addEventListener('click', async () => {
    await bg.suspendAll()
    window.close()
  })

  document.getElementById('resume-all').addEventListener('click', async () => {
    await bg.resumeAll()
    window.close()
  })
})()
