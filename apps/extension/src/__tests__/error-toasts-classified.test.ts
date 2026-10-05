import { readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { stripComments } from "./analyticsScan"
import { lineAt, listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * An error toast without a `cause` or an `errorCategory` does not compile (`NotificationProps`),
 * and `notify` sends its `error_shown`. A toast shown through react-toastify directly, or through
 * `notifyCustom`, would skip both, so these are the only ways around it, each allowed by name.
 */
const SRC = join(REPO_ROOT, "apps/extension/src")
const NOTIFICATIONS = "ui/components/Notifications/"

const TOAST_IMPORT = /import\s+\{[^}]*\btoast\b[^}]*\}\s+from\s+["']react-toastify["']/g
const NOTIFY_CUSTOM = /\bnotifyCustom\s*\(/g

const TOAST_IMPORTERS: Readonly<Record<string, string>> = {
  "ui/domains/TaoDashboard/subnet/swap/SwapTxNotifications.tsx": "toast.dismiss only",
}

const NOTIFY_CUSTOM_CALLERS: Readonly<Record<string, string>> = {
  "ui/apps/dashboard/layout/notifications/OnboardingToast.tsx": "the onboarding welcome toast",
}

const violations = (pattern: RegExp, allowed: Readonly<Record<string, string>>, message: string) =>
  listSourceFiles(SRC).flatMap((file) => {
    const path = relative(SRC, file)
    if (path.startsWith(NOTIFICATIONS) || path in allowed) return []
    const code = stripComments(readFileSync(file, "utf8"))
    return [...code.matchAll(pattern)].map(
      (match) => `${path}:${lineAt(code, match.index)} ${message}`
    )
  })

describe("error toasts", () => {
  it("import toast from react-toastify only inside components/Notifications", () => {
    expect(
      violations(
        TOAST_IMPORT,
        TOAST_IMPORTERS,
        "imports toast from react-toastify. Show toasts with notify or notifyUpdate from @ui/components/Notifications, so an error toast reports its category."
      )
    ).toEqual([])
  })

  it("call notifyCustom only from its allowed callers", () => {
    expect(
      violations(
        NOTIFY_CUSTOM,
        NOTIFY_CUSTOM_CALLERS,
        "calls notifyCustom, which reports no error category. Use notify, or list the file in NOTIFY_CUSTOM_CALLERS when it never shows an error."
      )
    ).toEqual([])
  })

  it("allow no file that no longer needs it", () => {
    const needs = (path: string, pattern: RegExp) =>
      pattern.test(stripComments(readFileSync(join(SRC, path), "utf8")))
    const stale = [
      ...Object.keys(TOAST_IMPORTERS).filter(
        (path) => !needs(path, new RegExp(TOAST_IMPORT.source))
      ),
      ...Object.keys(NOTIFY_CUSTOM_CALLERS).filter(
        (path) => !needs(path, new RegExp(NOTIFY_CUSTOM.source))
      ),
    ]
    expect(stale, `Remove these from the allow-lists: ${stale.join(", ")}`).toEqual([])
  })
})
