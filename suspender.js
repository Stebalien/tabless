/* global browser */

import {Once, debounce} from './util.js'

const SuspendUrl = browser.runtime.getURL('suspended.html')

const cleanHistory = debounce(async function cleanHistory () {
  await browser.history.deleteUrl({url: SuspendUrl})
})

const forgetClosedTabs = debounce(async function forgetClosedTabs () {
  await Promise.all((await browser.sessions.getRecentlyClosed()).filter(
    session => session.tab != null && session.tab.url.startsWith(SuspendUrl)
  ).map(
    session => browser.sessions.forgetClosedTab(session.tab.windowId, session.tab.sessionId)
  ))
}, 100)

async function tabState (tab) {
  return {
    screenshot: await browser.tabs.captureTab(tab.id),
    title: tab.title
  }
}
async function sendState (tab, state) {
  return browser.tabs.executeScript(tab.id, {code: `setState(${JSON.stringify(state)})`})
}
class Suspender {
  async suspendTab (tab) {
    if (tab.url.startsWith(SuspendUrl)) {
      // "it worked"
      return true
    }

    // Already discarded?
    if (tab.discarded) {
      return true
    }

    if (tab.active) {
      const state = await tabState(tab)
      const sTab = await browser.tabs.create({
        active: false,
        url: `/suspended.html`,
        openerTabId: tab.id,
        index: tab.index + 1,
        windowId: tab.windowId
      })

      cleanHistory()

      try {
        if (sendState(sTab, state)) {
          await browser.tabs.update(sTab.id, {active: true})
          await browser.tabs.discard([tab.id])
          await browser.sessions.setTabValue(sTab.id, 'state', state)
          return true
        }
      } catch (e) {
        console.log(e)
      }

      try {
        await browser.tabs.remove([sTab.id])
      } catch (e) {}

      return false
    } else {
      try {
        await browser.tabs.discard([tab.id])
      } catch (e) {}
    }

    return true
  }

  async suspendAll () {
    await Promise.all((await browser.tabs.query({
      url: '*://*/*',
      discarded: false
    })).map(tab => this.suspendTab(tab)))
  }

  async suspendCurrent () {
    await Promise.all((await browser.tabs.query({
      url: '*://*/*',
      discarded: false,
      active: true,
      currentWindow: true
    })).map(tab => this.suspendTab(tab)))
  }

  async resumeAll () {
    const tabs = await browser.tabs.query({url: SuspendUrl})
    await browser.tabs.remove(tabs.map(tab => tab.id))
  }

  async _processSuspendTabMessage (message, sender) {
    if (!sender.tab.url.startsWith(SuspendUrl)) {
      throw new Error('permission denied')
    }

    switch (message.type) {
      case 'resume':
        try {
          await browser.tabs.remove([sender.tab.id])
        } catch (e) {
          console.log(e)
        }
        return
      default:
        throw new Error('unknown message type')
    }
  }

  async _start () {
    browser.tabs.onRemoved.addListener(async (tabId) => forgetClosedTabs())
    browser.runtime.onMessage.addListener(async (message, sender) => this._processSuspendTabMessage(message, sender))

    return Promise.all((await browser.tabs.query({
      url: SuspendUrl
    })).map(async tab => {
      if (tab.title !== 'Suspended Tab') {
        return
      }
      const state = await browser.sessions.getTabValue(tab.id, 'state')
      if (state == null) {
        await browser.tabs.remove([tab.id])
      }

      await browser.tabs.reload(tab.id) // needs to be reloaded on restart.
      await sendState(tab, state)
    }))
  }
}

const instance = new Once()
export default async function start () {
  return instance.do(async () => {
    const suspender = new Suspender()
    await suspender._start()
    return suspender
  })
}
