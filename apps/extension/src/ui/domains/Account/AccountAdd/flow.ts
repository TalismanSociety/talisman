import type { AccountMethod } from "@common/analytics/accounts"
import { type FlowStep, flows, useFlow } from "@ui/hooks/analytics/flows"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useEffect, useId, useState } from "react"
import { useLocation } from "react-router-dom"

export type AddAccountStep = FlowStep<typeof flows.add_account>

const METHOD_OF_ROUTE: Readonly<Record<string, AccountMethod>> = {
  derived: "new",
  mnemonic: "recovery_phrase",
  pk: "private_key",
  json: "json",
  ledger: "ledger",
  qr: "polkadot_vault",
  signet: "signet",
  watched: "watch",
}

/** `/accounts/add/<method>/<sub>`: the menu's step is its screen, a sub-route picks accounts. */
export const addAccountRoute = (
  pathname: string
): { method?: AccountMethod; step: AddAccountStep | null } => {
  const [method, sub] = pathname.split("/").filter(Boolean).slice(2)
  const known = method === undefined ? undefined : METHOD_OF_ROUTE[method]
  if (!known) return { step: null }
  return { method: known, step: sub ? "select_accounts" : "form" }
}

type Declared = readonly (readonly [id: string, step: AddAccountStep])[]

const useAccountAddFlowProvider = () => {
  const { pathname } = useLocation()
  const route = addAccountRoute(pathname)
  const [declared, setDeclared] = useState<Declared>([])

  const declare = useCallback((id: string, step: AddAccountStep | null) => {
    setDeclared((current) => {
      const others = current.filter(([key]) => key !== id)
      return step ? [...others, [id, step]] : others
    })
  }, [])

  useFlow(flows.add_account, {
    step: declared.at(-1)?.[1] ?? route.step,
    attributes: route.method ? { method: route.method } : {},
  })

  return { declare }
}

const [AccountAddFlowProvider, useAccountAddFlow] = provideContext(useAccountAddFlowProvider)

export { AccountAddFlowProvider }

/**
 * A step the route does not show: a modal, a device prompt or a stage of the form. The latest
 * one declared wins, and the route's step returns once none is.
 */
export const useAddAccountStep = (step: AddAccountStep | null) => {
  const { declare } = useAccountAddFlow()
  const id = useId()
  useEffect(() => {
    declare(id, step)
    return () => declare(id, null)
  }, [declare, id, step])
}
