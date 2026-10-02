#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import { chromium } from "@playwright/test"
import { cdpPort, HOST_CDP_PORT } from "./cdp-port.mjs"

const CDP_PORT = cdpPort()
const CDP = `http://localhost:${CDP_PORT}`
const DEV_SERVER_PORT = 8254
const EXTENSION = "chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno"

const sh = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
  } catch {
    return ""
  }
}

const RELEASE_SHA = /\d+\.\d+\.\d+-dev-([0-9a-f]{7,40})[`"]/g

// Reads the build sha from the scripts the service worker runs. The manifest is reread from disk on
// each load, but Chromium can keep running an older build's cached background script.
async function runningBuildShas(workerUrl) {
  const targets = await (await fetch(`${CDP}/json/list`)).json()
  const target = targets.find((t) => t.url === workerUrl)
  if (!target) throw new Error(`no CDP target for ${workerUrl}`)
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  const closed = new Promise((_, reject) => {
    socket.onerror = () => reject(new Error("the service worker CDP socket failed"))
    socket.onclose = () => reject(new Error("the service worker closed its CDP socket"))
  })
  closed.catch(() => {})
  const scriptIds = []
  const pending = new Map()
  let nextId = 1
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === "Debugger.scriptParsed") scriptIds.push(message.params.scriptId)
    const reply = pending.get(message.id)
    if (message.error) reply?.reject(new Error(`${message.error.message} (${message.error.code})`))
    else reply?.resolve(message.result)
  }
  const send = (method, params) => {
    const id = nextId++
    const reply = new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
    socket.send(JSON.stringify({ id, method, params }))
    return Promise.race([reply, closed])
  }
  try {
    await Promise.race([new Promise((resolve) => (socket.onopen = resolve)), closed])
    await send("Debugger.enable")
    const shas = new Set()
    for (const scriptId of scriptIds) {
      const { scriptSource = "" } = await send("Debugger.getScriptSource", { scriptId })
      for (const [, sha] of scriptSource.matchAll(RELEASE_SHA)) shas.add(sha)
    }
    return [...shas]
  } finally {
    socket.onclose = null
    socket.close()
  }
}

const deadline = (ms, what) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${what} took over ${ms / 1000}s`)), ms).unref()
  )

const results = []
const check = (name, ok, detail) => {
  results.push(ok)
  process.stdout.write(`${ok ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}\n`)
  return ok
}

const repoRoot = sh("git", ["rev-parse", "--show-toplevel"])
const gitDir = sh("git", ["rev-parse", "--absolute-git-dir"])
const commonDir = sh("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"])
const head = sh("git", ["rev-parse", "HEAD"])
const commitOf = (sha) => sh("git", ["rev-parse", "--verify", "--quiet", `${sha}^{commit}`])
const short = (sha) => sha.slice(0, 9)

// A browser on another port has a dev server of its own, out of reach of these host checks.
const isHost = CDP_PORT === HOST_CDP_PORT
if (isHost) {
  const isMainCheckout = check(
    "main checkout (not a git worktree)",
    gitDir === commonDir,
    gitDir === commonDir
      ? repoRoot
      : `${repoRoot} is a worktree and :${HOST_CDP_PORT} is the main checkout's browser: write the CDP port of a browser of its own to .tmp/verify/cdp-port (verify skill, step 1)`
  )
  if (!isMainCheckout) process.exit(1)

  const serverPid = sh("lsof", ["-ti", `tcp:${DEV_SERVER_PORT}`, "-sTCP:LISTEN"]).split("\n")[0]
  const serverCmd = serverPid ? sh("ps", ["-o", "command=", "-p", serverPid]) : ""
  check(
    `dev server on :${DEV_SERVER_PORT} is wxt from this checkout`,
    serverCmd.includes(`${repoRoot}/apps/extension/`) && serverCmd.includes("wxt"),
    serverPid ? `pid ${serverPid}` : "nothing listening, run the Launch step"
  )
}

let version
try {
  const res = await fetch(`${CDP}/json/version`)
  version = await res.json()
} catch {}
if (
  !check(
    isHost
      ? `dev Chrome answers CDP on :${CDP_PORT}`
      : `browser of this checkout answers CDP on :${CDP_PORT} (host checks skipped)`,
    !!version,
    version?.Browser
  )
)
  process.exit(1)

const browser = await chromium.connectOverCDP(CDP)
const context = browser.contexts()[0]
const findWorker = () => context.serviceWorkers().find((w) => w.url().startsWith(EXTENSION))

let worker = findWorker()
if (!worker) {
  const wake = await context.newPage()
  await wake.goto(`${EXTENSION}/dashboard.html`).catch(() => {})
  worker =
    findWorker() ??
    (await context.waitForEvent("serviceworker", { timeout: 20_000 }).catch(() => undefined))
  await wake.close()
}

if (check("extension service worker is running", !!worker, worker?.url())) {
  const versionName = await worker.evaluate(() => chrome.runtime.getManifest().version_name)
  const built = versionName.match(/ - ([0-9a-f]+)$/)?.[1] ?? versionName
  const running = await Promise.race([
    runningBuildShas(worker.url()),
    deadline(20_000, "reading the service worker scripts"),
  ]).catch((error) => error)
  const isRunningHead =
    Array.isArray(running) && running.length === 1 && commitOf(running[0]) === head
  check(
    "running build matches git HEAD",
    isRunningHead,
    running instanceof Error
      ? running.message
      : `built ${built}, running ${running.join(", ") || "no build sha found"}, HEAD ${short(head)}${
          isRunningHead
            ? ""
            : commitOf(built) !== head
              ? ": the build predates HEAD, restart it (pnpm dev:kill && pnpm dev, or the runner's sync)"
              : ": the service worker runs a cached older script, reload the extension in chrome://extensions or restart the browser"
        }`
  )
}
const onboarded =
  !!worker &&
  (await worker.evaluate(() =>
    chrome.storage.local.get("app").then(({ app }) => app?.onboarded)
  )) === "TRUE"
check("wallet is onboarded", onboarded, onboarded ? "" : "fresh profile: onboard it first")

const page = await context.newPage()
const failedModules = []
page.on("response", (response) => {
  if (response.status() >= 400 && response.url().startsWith(`http://localhost:${DEV_SERVER_PORT}/`))
    failedModules.push(`${response.status()} ${response.url()}`)
})
await page.goto(`${EXTENSION}/dashboard.html#/portfolio`).catch(() => {})
const rendered = await page
  .waitForFunction(() => (document.getElementById("root")?.childElementCount ?? 0) > 0, null, {
    timeout: 45_000,
  })
  .then(() => true)
  .catch(() => false)
check(
  "dashboard renders",
  rendered,
  rendered ? "" : failedModules.join(", ") || "empty #root after 45s"
)
if (rendered && onboarded) {
  const state = await Promise.race([
    page
      .getByTestId("top-actions-buttons")
      .waitFor({ timeout: 45_000 })
      .then(() => "unlocked"),
    page
      .getByText("Please unlock the Talisman")
      .waitFor({ timeout: 45_000 })
      .then(() => "locked"),
  ]).catch(() => "unknown")
  check(
    "wallet is unlocked",
    state === "unlocked",
    state === "locked"
      ? "set PASSWORD in apps/extension/.env, or unlock in the popup"
      : state === "unknown"
        ? "neither the portfolio nor the lock screen showed within 45s"
        : ""
  )
}
await page.close()

await browser.close()
process.exit(results.every(Boolean) ? 0 : 1)
