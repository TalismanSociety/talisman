import { log } from "@common/log"
import { Subject } from "rxjs"

import { type ProofOfWorkSolve, registerInstall } from "./client"
import { gandalfStore } from "./store"

export const proofOfWorkSolves$ = new Subject<ProofOfWorkSolve>()

export async function ensureRegistered(): Promise<{ installId: string; privateKeyHex: string }> {
  const { installId, privateKeyHex } = await gandalfStore.get()

  if (installId && privateKeyHex) return { installId, privateKeyHex }

  log.debug("Gandalf: no install credentials found, registering…")
  const credentials = await registerInstall()
  proofOfWorkSolves$.next(credentials.proofOfWork)

  // credentials may have appeared while the proof-of-work was solving (e.g. e2e fixtures
  // seeding pre-registered ones) - keep them, ours were never used to sign anything
  const existing = await gandalfStore.get()
  if (existing.installId && existing.privateKeyHex)
    return { installId: existing.installId, privateKeyHex: existing.privateKeyHex }

  await gandalfStore.set({
    installId: credentials.installId,
    privateKeyHex: credentials.privateKeyHex,
  })

  log.debug("Gandalf: registered with installId", credentials.installId)
  return credentials
}
