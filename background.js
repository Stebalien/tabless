/* global browser, URLSearchParams */

'use strict'

const UrlPrefix = browser.runtime.getURL('')
const SuspendUrl = browser.runtime.getURL('suspended.html')

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

    // Open a suspend tab.
    await browser.tabs.create({
      active: false,
      url: `/suspended.html#${args}`,
      openerTabId: tab.id,
      index: tab.index + 1,
      windowId: tab.windowId
    })
    await cleanHistory()
  } else {
    await browser.tabs.discard([tab.id])
  }
}

async function suspendAll () {
  await Promise.all((await browser.tabs.query({
    url: '*://*/*',
    discarded: false
  })).map(suspendTab))
}

async function suspendCurrent () {
  await Promise.all((await browser.tabs.query({
    url: '*://*/*',
    discarded: false,
    active: true,
    currentWindow: true
  })).map(suspendTab))
}

async function resumeAll () {
  const tabs = await browser.tabs.query({url: SuspendUrl})
  await browser.tabs.remove(tabs.map(tab => tab.id))
}

async function cleanHistory () {
  await browser.history.deleteUrl({url: SuspendUrl})
}

async function resumeTab (tab) {
  try {
    await browser.tabs.remove([tab.id])
    await browser.sessions.forgetClosedTab(tab.windowId, tab.sessionId)
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

  let windowId = tab.windowId
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

browser.runtime.onMessage.addListener(async (message, sender) => {
  switch (message.type) {
    case 'resume':
      resumeTab(sender.tab)
      break
    case 'suspend_begin':
      let state = await browser.sessions.getTabValue(sender.tab.id, 'state')
      if (state == null) {
        const screenshot = await browser.tabs.captureTab(sender.tab.openerTabId, {
          format: 'jpeg',
          quality: 10
        })
        state = {screenshot: screenshot}
        await browser.sessions.setTabValue(
          sender.tab.id,
          'state',
          state
        )
      }
      return state
    case 'suspend_complete':
      if (sender.tab.openerTabId != null) {
        await browser.tabs.update(sender.tab.id, {active: true})
        await browser.tabs.discard([sender.tab.openerTabId])
      }
  }
})

(async () => {
  await Promise.all((await browser.tabs.query({})).map(registerTab))
})()
