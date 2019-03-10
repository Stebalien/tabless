/* global browser, URLSearchParams */

(async function () {
  'use strict'

  const UrlPrefix = browser.runtime.getURL('')

  const windowOwners = new Map()
  const tabsInProgress = new Set()

  function makeOwner (windowId, tabId) {
    const owner = windowOwners.get(windowId)
    if (owner !== tabId && owner != null) {
      return false
    }
    windowOwners.set(windowId, tabId)
    return true
  }

  function releaseOwner (windowId, tabId) {
    if (windowOwners.get(windowId) === tabId) {
      windowOwners.delete(windowId)
    }
  }

  async function suspendTab (tab) {
    if (tab.discarded) {
      return
    }
    if (tab.active) {
      const args = new URLSearchParams()
      args.set('title', tab.title)
      args.set('screenshot', await browser.tabs.captureTab(tab.id, {
        format: 'jpeg',
        quality: 10
      }))
      await browser.tabs.create({
        active: true,
        url: `/suspended.html#${args.toString()}`,
        openerTabId: tab.id,
        index: tab.index + 1,
        windowId: tab.windowId
      })
    }
    await browser.tabs.discard([tab.id])
  }

  async function resumeTab (tab) {
    try {
      await browser.tabs.remove([tab.id])
    } catch (e) {
      console.log(e)
    }
  }

  async function registerTab (tab) {
    const tabId = tab.id
    if (tabsInProgress.has(tabId)) {
      return
    }

    if (tabId === browser.tabs.TAB_ID_NONE) {
      return
    }

    if (tab.url === 'about:blank' && tab.title !== 'New Tab') {
      return
    }

    if (tab.url.startsWith(UrlPrefix)) {
      // Ignore suspend pages.
      return
    }

    tabsInProgress.add(tabId)

    var windowId = tab.windowId
    try {
      // Create new windows till we get our own.
      while (!makeOwner(windowId, tabId)) {
        const window = await browser.windows.create({
          tabId: tabId
        })
        windowId = window.id
      }
    } catch (err) {
      console.error(err)
    } finally {
      tabsInProgress.delete(tabId)
    }
  }

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    registerTab(tab)
  })

  browser.tabs.onDetached.addListener((tabId, detachInfo) => releaseOwner(detachInfo.oldWindowId, tabId))
  browser.tabs.onRemoved.addListener((tabId, removeInfo) => releaseOwner(removeInfo.windowId, tabId))

  browser.runtime.onMessage.addListener((message, sender) => {
    switch (message.type) {
      case 'suspend':
        suspendTab(sender.tab)
        break
      case 'resume':
        resumeTab(sender.tab)
        break
    }
  })
  browser.browserAction.onClicked.addListener(async () => {
    for (const tab of await browser.tabs.query({url: '*://*', discarded: false})) {
      suspendTab(tab)
    }
  })

  for (const tab of await browser.tabs.query({})) {
    registerTab(tab)
  }
})()
