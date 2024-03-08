# talisman-shared

Contains code used by both extension-core and the browser extension wallet itself.

Most importanly, it contains the shared bits that are needed by page.js & content_script.js, allowing to keep their size small.

`"sideEffects": false` is used in the `package.json` file to enable webpack treeshaking.
