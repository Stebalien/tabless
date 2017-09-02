/* global browser */
(function() {
  'use strict';

  browser.tabs.onCreated.addListener(function(tab) {
    // Ignore weird windows.
    if (tab.id === browser.tabs.TAB_ID_NONE) {
      return;
    }

    // This feels like a bug (and it's the only reason I need the tabs permission! Damn!)
    if (tab.favIconUrl === "chrome://browser/skin/customizableui/customizeFavicon.ico") {
      return;
    }

    browser.tabs.query({windowId: tab.windowId}).then(function(tabs) {
      if (tabs.length <= 1) {
        return null;
      }
      return browser.windows.create({
        tabId: tab.id
      });
    }).catch(function(err) {
      console.error(err);
    });
  });
})();
