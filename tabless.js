/* global browser */

import {Once} from './util.js'

const UrlPrefix = browser.runtime.getURL('')

class Tabless {
  constructor () {
    this._windowOwners = new Map()
    this._tabsInProgress = new Set()
    this._startOnce = new Once()
  }

  _makeOwner (windowId, tabId) {
    const owner = this._windowOwners.get(windowId)
    if (owner !== tabId && owner != null) {
      return false
    }
    this._windowOwners.set(windowId, tabId)
    return true
  }

  _releaseOwner (windowId, tabId) {
    if (this._windowOwners.get(windowId) === tabId) {
      this._windowOwners.delete(windowId)
    }
  }

  async _registerTab (tab) {
    const tabId = tab.id
    if (this._tabsInProgress.has(tabId)) {
      return
    }

    if (tabId === browser.tabs.TAB_ID_NONE) {
      return
    }

    if (tab.url === 'about:blank' && (
      (tab.height === 0 && tab.width === 0) || tab.title !== 'New Tab'
    )) {
      return
    }

    if (tab.url.startsWith(UrlPrefix)) {
      // Ignore suspend pages.
      return
    }

    this._tabsInProgress.add(tabId)

    let windowId = tab.windowId
    try {
      // Create new windows till we get our own.
      while (!this._makeOwner(windowId, tabId)) {
        const window = await browser.windows.create({
          tabId: tabId
        })
        windowId = window.id
      }
    } catch (err) {
      // don't care. This just means the tab no longer exists.
    } finally {
      this._tabsInProgress.delete(tabId)
    }
  }

  async _start () {
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => this._registerTab(tab))
    browser.tabs.onRemoved.addListener((tabId, removeInfo) => this._releaseOwner(removeInfo.windowId, tabId))
    await Promise.all((await browser.tabs.query({})).map(tab => this._registerTab(tab)))
  }
}

const instance = new Once()
export default async function _start () {
  return instance.do(async () => {
    const tabless = new Tabless()
    await tabless._start()
    return tabless
  })
}
