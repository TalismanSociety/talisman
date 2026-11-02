import { db } from "@core/db"
import type { SwapPlan, SwapPlanId } from "@core/domains/swaps/plans/types"
import { networkIdFromTokenId, type TokenId } from "@talismn/chaindata-provider"
import { formatDecimals, getErrorMessage, planckToTokens } from "@talismn/util"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { notify } from "@ui/components/Notifications"
import { useAccountsMap } from "@ui/state/accounts"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useLiveQuery } from "dexie-react-hooks"
import { type FC, useState } from "react"
import { useTranslation } from "react-i18next"

type PausedPlanFunds = {
  tokenId: TokenId
  address: string
  /** what the leg before delivered, null when nothing landed yet */
  amount: bigint | null
}

/** where the funds of a paused plan wait: on the signer of the leg that waits for the user */
export const pausedPlanFunds = (plan: SwapPlan): PausedPlanFunds | null => {
  const waiting = plan.legs.findIndex((leg) => leg.state.at === "awaiting-user")
  if (waiting === -1) return null
  const { fromTokenId, signer } = plan.legs[waiting].quote
  const before = plan.legs[waiting - 1]?.state
  return {
    tokenId: fromTokenId,
    address: signer,
    amount: before?.at === "landed" ? BigInt(before.amount) : null,
  }
}

const usePausedPlans = () =>
  useLiveQuery(() => db.swapPlans.where("phase").equals("paused").sortBy("createdAt"), [], [])

const DropConfirm: FC<{ funds: PausedPlanFunds; onKeep: () => void; onDrop: () => void }> = ({
  funds,
  onKeep,
  onDrop,
}) => {
  const { t } = useTranslation()
  const token = useToken(funds.tokenId)
  const network = useNetworkById(networkIdFromTokenId(funds.tokenId))
  const account = useAccountsMap()[funds.address]
  const [isDropping, setIsDropping] = useState(false)

  const amount =
    token && funds.amount !== null
      ? `${formatDecimals(planckToTokens(funds.amount.toString(), token.decimals))} ${token.symbol}`
      : token?.symbol

  return (
    <>
      <p className="text-body-secondary">
        {t(
          "Drop this swap? The {{amount}} it already swapped stays on {{account}} on {{network}}.",
          {
            amount,
            account: account?.name ?? funds.address,
            network: network?.name,
          }
        )}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Button small onClick={onKeep} disabled={isDropping}>
          {t("Keep")}
        </Button>
        <Button
          small
          color="red"
          processing={isDropping}
          onClick={() => {
            setIsDropping(true)
            onDrop()
          }}
        >
          {t("Drop")}
        </Button>
      </div>
    </>
  )
}

const PausedPlan: FC<{ plan: SwapPlan; onContinue: (id: SwapPlanId) => void }> = ({
  plan,
  onContinue,
}) => {
  const { t } = useTranslation()
  const from = useToken(plan.legs[0].quote.fromTokenId)
  const to = useToken(plan.legs[plan.legs.length - 1].quote.toTokenId)
  const funds = pausedPlanFunds(plan)
  const [isConfirmingDrop, setIsConfirmingDrop] = useState(false)

  const drop = async () => {
    try {
      await api.swapPlanCancel(plan.id)
    } catch (cause) {
      setIsConfirmingDrop(false)
      notify({
        type: "error",
        title: t("Failed to drop the swap"),
        subtitle: getErrorMessage(cause),
        cause,
      })
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded bg-grey-900 p-8 text-xs">
      <div className="flex flex-col gap-2">
        <div className="font-bold text-body text-sm">{t("Unfinished swap")}</div>
        <div className="text-body-secondary">
          {t("Your {{from}} to {{to}} swap is waiting for you.", {
            from: from?.symbol,
            to: to?.symbol,
          })}
        </div>
      </div>
      {isConfirmingDrop && funds ? (
        <DropConfirm funds={funds} onKeep={() => setIsConfirmingDrop(false)} onDrop={drop} />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Button small onClick={() => setIsConfirmingDrop(true)}>
            {t("Drop")}
          </Button>
          <Button small primary onClick={() => onContinue(plan.id)}>
            {t("Continue")}
          </Button>
        </div>
      )}
    </div>
  )
}

/** the paused plans hold their accounts until the user signs their next leg or drops them */
export const SwapPausedPlans: FC<{ onContinue: (id: SwapPlanId) => void }> = ({ onContinue }) => {
  const plans = usePausedPlans()
  if (!plans.length) return null
  return plans.map((plan) => <PausedPlan key={plan.id} plan={plan} onContinue={onContinue} />)
}
