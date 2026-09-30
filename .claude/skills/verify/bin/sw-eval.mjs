#!/usr/bin/env node
import { chromium } from "@playwright/test"

const EXTENSION = "chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno"
const expression = process.argv[2]
if (!expression) {
  process.stderr.write(
    'usage: sw-eval.mjs "<async JS expression evaluated in the background service worker>"\n'
  )
  process.exit(2)
}

const browser = await chromium.connectOverCDP("http://localhost:9223")
const worker = browser
  .contexts()[0]
  .serviceWorkers()
  .find((w) => w.url().startsWith(EXTENSION))
if (!worker) {
  process.stderr.write(
    "no extension service worker: open an extension page to wake it, then retry\n"
  )
  await browser.close()
  process.exit(1)
}

const result = await worker.evaluate(`(async () => (${expression}))()`)
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
await browser.close()
