#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import { chromium } from "@playwright/test"

const CDP_PORT = process.env.VERIFY_CDP_PORT ?? "9223"
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

// Reads the build sha from the scripts the service worker runs. The manifest is reread from disk on
// each load, but Chromium can keep running an older build's cached background script.
async function runningBuildShas() {
  const targets = await (await fetch(`${CDP}/json/list`)).json()
  const target = targets.find((t) => t.type === "service_worker" && t.url.startsWith(EXTENSION))
  if (!target) return []
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.onopen = resolve
    socket.onerror = reject
  })
  const scriptIds = []
  const replies = new Map()
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === "Debugger.scriptParsed") scriptIds.push(message.params.scriptId)
    replies.get(message.id)?.(message.result)
  }
  const send = (method, params) =>
    new Promise((resolve) => {
      const id = replies.size + 1
      replies.set(id, resolve)
      socket.send(JSON.stringify({ id, method, params }))
    })
  await send("Debugger.enable")
  const shas = new Set()
  for (const scriptId of scriptIds) {
    const { scriptSource } = await send("Debugger.getScriptSource", { scriptId })
    for (const [, sha] of scriptSource.matchAll(/\d+\.\d+\.\d+-dev-([0-9a-f]{7,40})[`"]/g))
      shas.add(sha)
  }
  await send("Debugger.disable")
  socket.close()
  return [...shas]
}

const results = []
const check = (name, ok, detail) => {
  results.push(ok)
  process.stdout.write(`${ok ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}\n`)
  return ok
}

const repoRoot = sh("git", ["rev-parse", "--show-toplevel"])
const gitDir = sh("git", ["rev-parse", "--absolute-git-dir"])
const commonDir = sh("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"])
const head = sh("git", ["rev-parse", "--short", "HEAD"])

// A browser on another port has a dev server of its own, out of reach of these host checks.
if (CDP_PORT === "9223") {
  check(
    "main checkout (not a git worktree)",
    gitDir === commonDir,
    gitDir === commonDir ? repoRoot : `${repoRoot}: set VERIFY_CDP_PORT to a browser of its own`
  )

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
if (!check(`dev Chrome answers CDP on :${CDP_PORT}`, !!version, version?.Browser)) process.exit(1)

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
  const running = await runningBuildShas()
  check(
    "running build matches git HEAD",
    running.length === 1 && running[0] === head,
    `running ${running.join(", ") || "no sha found"}, HEAD ${head}`
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
