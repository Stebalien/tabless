Tabless Suspenders is a simple Firefox WebExtension for disabling tabbed browsing while preserving the ability to suspend (unload) websites.

- Whenever you try to open a new tab, tabless will move it to its own window.
- You can suspend one or all open windows, unloading the website to save some memory.

Why? There are a lot of really good window managers out there and Firefox isn't one of them.

## Hiding The Tab Bar

For best results, you should hide the tab bar by adding the following to `chrome/userChrome.css` (in your Firefox profile) and setting the `toolkit.legacyUserProfileCustomizations.stylesheets` `about:config` flag to `true`.

```css
@-moz-document url('chrome://browser/content/browser.xhtml') {
    #TabsToolbar {
        visibility: collapse !important;
    }
}
```

See this [superuser](https://superuser.com/questions/1268732/how-to-hide-tab-bar-tabstrip-in-firefox-57-quantum) question for more information.

## Permissions

Why all the permissions?

- We "screenshot" tabs when unloading them for better UX.
- Tab suspension is implemented by creating/focusing a "suspended" placeholder tab, putting the "real" tab into the background and unloading it. We then have to edit this placeholder tab out of the session/history to avoid cluttering the history.

## Installing

If you actually want to use this, you'll have to build it yourself and either (a) configure Firefox to not require signed extensions or (b) submit it to Mozilla for signing.
