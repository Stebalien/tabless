Tabless is a simple Firefox WebExtension for disabling tabs. Whenever you try to
open a new tab, it will move it to a new window.

Why would you want to use this? Because some of use decent window managers that
manage windows better than Firefox.

Why does it need the "tabs" permission? To fix the CustomizeUI feature. Firefox
opens it in a new tab and popping that tab out into a window breaks it.
Unfortunately, we need the tabs permission to detect this tab.
