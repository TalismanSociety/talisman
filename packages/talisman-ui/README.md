# talisman-ui

Shared UI components.

This library is meant to be used as an internal dependency, which helps consuming it from inside the monorepo without the need to build it.

## Setup in a dapp (or extension) to use this library

Add dependencies :

```bash
pnpm --filter <my-workspace-name> add -D tailwindcss autoprefixer postcss
```

At the root of the new project, create a `tailwind.config.cjs` file with the following content :

```js
/* eslint-env es2021 */
const TALISMAN_TAILWIND_CONFIG = require("talisman-ui/tailwind.config.cjs")

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...TALISMAN_TAILWIND_CONFIG,
  content: [
    "./**/*.{html,ts,tsx,svg}",
    "./public/*.html",
    "../../packages/talisman-ui/**/*.{html,ts,tsx,svg,css}",
  ],
}
```

At the root of the new project, create a `postcss.config.cjs` file with the following content :

```js
/* eslint-env es2021 */
const tailwindcss = require("tailwindcss")
const autoprefixer = require("autoprefixer")

module.exports = {
  plugins: [tailwindcss("./tailwind.config.cjs"), autoprefixer],
}
```

In the new project, create a `src/styles/styles.css` with the following content :

```css
@import "talisman-ui/styles.css";

@layer base {
  /* Your base style (defaults) here */
}

@layer components {
  /* Your reusable component classes here */
}

@layer utilities {
  /* Your utility classes here */
}
```

Then import that file in your website entry point :

```tsx
// index.tsx
import "./styles/styles.css"
```

Note : if using webpack, postcss will throw an error when trying to import the css file from talisman-ui.  
Add `postcss-import` to the beginning of your `plugins` array inside your `postcss.config.cjs`, and change the import to be `import "@import "talisman-ui/src/styles/styles.css";`.

```js
/* eslint-env es2021 */
const postcssImport = require("postcss-import")
const tailwindcss = require("tailwindcss")
const autoprefixer = require("autoprefixer")

module.exports = {
  plugins: [postcssImport, tailwindcss("./tailwind.config.cjs"), autoprefixer],
}
```

Finally, import all the fonts from the [fonts](./fonts) folder of this project. Easiest way is to copy paste the folder into the public folder of the app, and add `<link rel="stylesheet" href="/fonts/fonts.css" />` to the `head` section of your index.html.
