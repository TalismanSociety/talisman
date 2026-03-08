---
name: playwright-wxt
description: "Interact with the Talisman wallet UI running in dev mode via the playwright-wxt MCP server. USE FOR: observing wallet state, clicking buttons, filling forms, taking screenshots, reading console logs, navigating extension pages, and validating UI behavior in the live dev browser. REQUIRES: the wallet dev server running (`pnpm dev` in apps/extension)."
---

# playwright-wxt — Live Wallet UI Interaction

Use the `playwright-wxt` MCP server to observe and interact with the Talisman wallet extension running in dev mode. The server connects to the WXT dev browser via Chrome DevTools Protocol on port `9223`.

## Prerequisites

The wallet must be running in dev mode before using any of these tools:

```sh
cd apps/extension && pnpm dev
```

This launches a Chromium browser with the extension loaded and CDP enabled on port 9223.

## Limitation: Cannot Open Extension Pages

The MCP server **cannot navigate to `chrome-extension://` URLs** on its own — the browser blocks it. If the extension page you need (popup, dashboard, onboarding) is not already open in a tab, you **must ask the user to open it manually** in the dev browser. Once the page is open, you can select the tab and interact with it normally.

## Extension Details

| Property       | Value                                      |
| -------------- | ------------------------------------------ |
| Extension ID   | `akcdepjilgckjbngkhjghfnmnnkdnmno`        |
| CDP endpoint   | `http://127.0.0.1:9223`                    |
| Popup URL      | `chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno/popup.html`   |
| Dashboard URL  | `chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno/dashboard.html` |
| Onboarding URL | `chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno/onboarding.html` |

## File Storage

Save **all** files produced by these tools (screenshots, console logs, snapshots) into the `.playwright-mcp/` directory at the workspace root. Use relative paths when the tool supports a `filename` parameter (e.g. `filename: ".playwright-mcp/screenshot.png"`).

## Available Tools (all prefixed `mcp_playwright-wx_`)

### Navigation & Tabs

| Tool                    | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `browser_navigate`      | Navigate to a URL (use extension URLs above) |
| `browser_navigate_back` | Go back in history                        |
| `browser_tabs`          | List / create / close / select tabs       |

### Observing the Page

| Tool                       | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `browser_snapshot`         | **Primary tool** — returns accessibility tree with `ref` identifiers for every interactive element. Use this before any click/type action. |
| `browser_take_screenshot`  | Capture a visual screenshot (PNG or JPEG). Use for visual validation. |
| `browser_console_messages` | Retrieve console logs (error / warning / info / debug).  |
| `browser_network_requests` | List network requests since page load.                   |

### Interacting with Elements

Every interaction tool requires a `ref` obtained from `browser_snapshot`.

| Tool                  | Purpose                                                    |
| --------------------- | ---------------------------------------------------------- |
| `browser_click`       | Click an element (left/right/middle, double-click, modifiers) |
| `browser_type`        | Type text into an input. Use `slowly: true` for key-handler triggers. `submit: true` presses Enter after. |
| `browser_fill_form`   | Fill multiple form fields at once (textbox, checkbox, radio, combobox, slider). |
| `browser_hover`       | Hover over an element.                                     |
| `browser_press_key`   | Press a keyboard key (e.g. `Escape`, `ArrowDown`, `Enter`). |
| `browser_select_option` | Select dropdown option(s).                               |
| `browser_drag`        | Drag and drop between two elements.                        |
| `browser_file_upload` | Upload file(s) via a file chooser.                         |

### Advanced

| Tool                  | Purpose                                         |
| --------------------- | ------------------------------------------------ |
| `browser_evaluate`    | Run arbitrary JavaScript on the page or element. |
| `browser_run_code`    | Run a Playwright code snippet with full `page` API access. |
| `browser_wait_for`    | Wait for text to appear/disappear or a timeout.  |
| `browser_handle_dialog` | Accept or dismiss a browser dialog.            |
| `browser_resize`      | Resize the browser viewport.                     |
| `browser_close`       | Close the current page.                          |
| `browser_install`     | Install the browser binary (if missing).         |

## Workflow

1. **Ensure the extension page is open.** Use `browser_tabs` to list open tabs. If the page you need is already open, select it. If not, **ask the user** to open it in the dev browser (e.g. "Please open the popup/dashboard in the dev browser so I can interact with it"). Do **not** attempt `browser_navigate` to a `chrome-extension://` URL — it will fail.

2. **Snapshot** the page to discover interactive elements and their `ref` values:
   ```
   browser_snapshot
   ```

3. **Act** on elements using their `ref` (click, type, select, etc.).

4. **Verify** the result with another snapshot or screenshot.

5. **Repeat** until the desired state is reached.

### Tips

- **Always snapshot before acting** — you need fresh `ref` values after every navigation or interaction that changes the DOM.
- **Popup vs Dashboard** — the popup is the small wallet overlay; the dashboard is the full-page view. Navigate to whichever you need.
- Use `browser_wait_for` with `text` to wait for loading states to resolve before taking a snapshot.
- Use `browser_console_messages` with `level: "error"` to check for runtime errors after interactions.
- When taking screenshots, save to `.playwright-mcp/` with a descriptive filename: `.playwright-mcp/after-send-click.png`.
- Use `browser_resize` to simulate popup dimensions (width: 400, height: 600) when testing the popup layout.
- Use `browser_evaluate` to inspect in-page state (e.g., read `localStorage`, query Redux/RxJS stores).
- Use `browser_run_code` for complex multi-step Playwright sequences that would be tedious as individual tool calls.
