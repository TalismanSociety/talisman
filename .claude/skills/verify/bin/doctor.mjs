#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import { chromium } from "@playwright/test"

const CDP = "http://localhost:9223"
const DEV_SERVER_PORT = 8254
const EXTENSION = "chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno"

const sh = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
  } catch {
    return ""
  }
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
check("main checkout (not a git worktree)", gitDir === commonDir, repoRoot)

const head = sh("git", ["rev-parse", "--short", "HEAD"])

const serverPid = sh("lsof", ["-ti", `tcp:${DEV_SERVER_PORT}`, "-sTCP:LISTEN"]).split("\n")[0]
const serverCmd = serverPid ? sh("ps", ["-o", "command=", "-p", serverPid]) : ""
check(
  `dev server on :${DEV_SERVER_PORT} is wxt from this checkout`,
  serverCmd.includes(`${repoRoot}/apps/extension/`) && serverCmd.includes("wxt"),
  serverPid ? `pid ${serverPid}` : "nothing listening, run the Launch step"
)

let version
try {
  const res = await fetch(`${CDP}/json/version`)
  version = await res.json()
} catch {}
if (!check("dev Chrome answers CDP on :9223", !!version, version?.Browser)) process.exit(1)

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
  check(
    "running build matches git HEAD",
    versionName.endsWith(head),
    `running "${versionName}", HEAD ${head}`
  )
}

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
if (rendered) {
  const onboarded = !page.url().includes("onboarding.html")
  check("wallet is onboarded", onboarded, onboarded ? "" : "redirected to onboarding.html")
  const locked = await page.getByText("Please unlock the Talisman").isVisible()
  check(
    "wallet is unlocked",
    !locked,
    locked ? "set PASSWORD in apps/extension/.env, or unlock in the popup" : ""
  )
}
await page.close()

await browser.close()
process.exit(results.every(Boolean) ? 0 : 1)
