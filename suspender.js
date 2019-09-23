/* global browser */

import {Once, debounce} from './util.js'

const SuspendUrl = browser.runtime.getURL('suspended.html')

const cleanHistory = debounce(async function cleanHistory () {
  await browser.history.deleteUrl({url: SuspendUrl})
}, 3000)

const forgetClosedTabs = debounce(async function forgetClosedTabs () {
  await Promise.all((await browser.sessions.getRecentlyClosed()).filter(
    session => session.tab != null && session.tab.url.startsWith(SuspendUrl)
  ).map(
    session => browser.sessions.forgetClosedTab(session.tab.windowId, session.tab.sessionId)
  ))
}, 3000)

async function tabState (tabId) {
  return {
    screenshot: await browser.tabs.captureTab(tabId),
    title: (await browser.tabs.get(tabId)).title
  }
}

async function inject (tabId) {
  await browser.tabs.executeScript(tabId, {file: '/suspended.js'})
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
      await browser.tabs.create({
        active: false,
        url: `/suspended.html`,
        openerTabId: tab.id,
        index: tab.index + 1,
        windowId: tab.windowId
      })
      return true
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
      case 'get_state':
        try {
          let state = await browser.sessions.getTabValue(sender.tab.id, 'state')
          if (state == null) {
            if (sender.tab.openerTabId == null) {
              throw new Error('orphaned suspend tab')
            }
            state = await tabState(sender.tab.openerTabId)
            await browser.sessions.setTabValue(sender.tab.id, 'state', state)
          }
          return state
        } catch (e) {
          await browser.tabs.remove([sender.tab.id])
          return
        }
      case 'finish_suspend':
        try {
          await browser.tabs.update(sender.tab.id, {active: true})
          if (sender.tab.openerTabId != null) {
            await browser.tabs.discard([sender.tab.openerTabId])
          }
        } catch (e) {
          await browser.tabs.remove([sender.tab.id])
        }
        return
      default:
        throw new Error('unknown message type')
    }
  }

  async _start () {
    browser.tabs.onRemoved.addListener(async (tabId) => forgetClosedTabs())
    browser.runtime.onMessage.addListener(async (message, sender) => this._processSuspendTabMessage(message, sender))
    browser.history.onVisited.addListener((item) => {
      if (item.url === SuspendUrl) {
        cleanHistory()
      }
    })

    // Can't use normal content scripts because we need to inject these into our
    // own extension pages.
    browser.webNavigation.onDOMContentLoaded.addListener(
      async (details) => inject(details.tabId),
      {url: [{urlEquals: SuspendUrl}]}
    )
    await Promise.all((await browser.tabs.query({url: SuspendUrl})).map(async tab => {
      try {
        inject(tab.id)
      } catch (e) {
        console.error(e)
      }
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
