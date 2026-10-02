#!/usr/bin/env node
// Prints the CDP port of the browser that serves this checkout: VERIFY_CDP_PORT, else the port in
// .tmp/verify/cdp-port, else the host dev Chrome (9223), which belongs to the main checkout only.
// A worktree with neither has no browser, so it exits 1 rather than drive the main checkout's.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

export const HOST_CDP_PORT = "9223"

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim()

const fail = (message) => {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

export function cdpPort() {
  const root = git("rev-parse", "--show-toplevel")
  const portFile = `${root}/.tmp/verify/cdp-port`
  let port = process.env.VERIFY_CDP_PORT
  if (!port) {
    try {
      port = readFileSync(portFile, "utf8").trim()
    } catch {}
  }
  if (!port) {
    const isWorktree =
      git("rev-parse", "--absolute-git-dir") !==
      git("rev-parse", "--path-format=absolute", "--git-common-dir")
    if (isWorktree)
      fail(
        `${root} is a git worktree with no browser of its own: write the CDP port of its browser to ${portFile} (verify skill, step 1)`
      )
    port = HOST_CDP_PORT
  }
  if (!/^\d+$/.test(port)) fail(`CDP port "${port}" is not a number`)
  return port
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.stdout.write(`${cdpPort()}\n`)
