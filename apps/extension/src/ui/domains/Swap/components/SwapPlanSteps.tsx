import type { BaseQuote, SupportedSwapProtocol } from "@core/domains/swaps/types"
import {
  getBlockExplorerUrl,
  networkIdFromTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import {
  TransactionsStepper,
  type TransactionsStepperStatus,
  type TransactionsStepperStep,
} from "@ui/components/TransactionsStepper"
import { AddressDisplay } from "@ui/domains/SendFunds/AddressDisplay"
import { useAccountsMap } from "@ui/state/accounts"
import { useNetworksMapById } from "@ui/state/chaindata"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

type StepLeg = {
  protocol: SupportedSwapProtocol
  fromTokenId: TokenId
  toTokenId: TokenId
  recipient: string | null
}

export type SwapPlanStepState = { status: TransactionsStepperStatus; hash?: string | null }

export const useSwapPlanSteps = (
  legs: readonly StepLeg[],
  states: readonly SwapPlanStepState[]
): TransactionsStepperStep[] => {
  const { t } = useTranslation()
  const accounts = useAccountsMap()
  const networks = useNetworksMapById()

  return useMemo(
    () =>
      legs.map((leg, index) => {
        const state = states[index] ?? { status: "upcoming" }
        const fromNetwork = networks[networkIdFromTokenId(leg.fromTokenId)]
        const toNetwork = networks[networkIdFromTokenId(leg.toTokenId)]
        const recipient = leg.recipient
          ? (accounts[normalizeAddress(leg.recipient)]?.name ?? shortenAddress(leg.recipient))
          : ""
        return {
          key: String(index),
          label:
            leg.protocol === "bittensor-evm"
              ? t("Move TAO to {{name}}", { name: recipient })
              : t("Bridge to {{network}}", { network: toNetwork?.name ?? "" }),
          status: state.status,
          href: state.hash
            ? (getBlockExplorerUrl(fromNetwork, { type: "transaction", id: state.hash }) ??
              undefined)
            : undefined,
        }
      }),
    [accounts, legs, networks, states, t]
  )
}

export const SwapPlanConfirmSteps: FC<{ quote: BaseQuote }> = ({ quote }) => {
  const { t } = useTranslation()
  const states = useMemo(
    () =>
      quote.legs.map(
        (_, index): SwapPlanStepState => ({ status: index === 0 ? "waiting-on-you" : "upcoming" })
      ),
    [quote.legs]
  )
  const steps = useSwapPlanSteps(quote.legs, states)

  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-lg bg-grey-900 px-8 py-6 text-xs">
      <TransactionsStepper steps={steps} />
      {quote.legs.slice(1).map((leg, index) => (
        <div
          key={`${leg.protocol}:${leg.fromTokenId}`}
          className="flex h-11 w-full items-center justify-between gap-4"
        >
          <div className="text-body-secondary">
            {t("Step {{step}} signed by", { step: index + 2 })}
          </div>
          <AddressDisplay
            address={leg.signer}
            networkId={networkIdFromTokenId(leg.fromTokenId)}
            className="text-xs"
            accountIconClassName="text-md!"
          />
        </div>
      ))}
    </div>
  )
}
