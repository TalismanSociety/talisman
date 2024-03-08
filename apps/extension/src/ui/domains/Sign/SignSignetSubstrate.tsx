import { AccountJsonSignet, SignerPayloadRaw } from "@extension/core"
import { SignerPayloadJSON } from "@substrate/txwrapper-core"
import { XCircleIcon } from "@talismn/icons"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

type Props = {
  account: AccountJsonSignet
  onCancel: () => void
  onApprove: () => Promise<void>
  payload: SignerPayloadJSON | SignerPayloadRaw
}

const SignetSignetError: React.FC<{ call: boolean; network: boolean }> = ({ call, network }) => {
  if (!call && !network) return null
  return (
    <div className="bg-grey-800 flex w-full items-center justify-center gap-4 rounded-sm p-6">
      <XCircleIcon className="text-alert-error min-w-[1em] shrink-0 text-[2rem]" />
      <p className="text-grey-300 text-left">
        {call
          ? "This request is not supported on Signet."
          : network
          ? "Network not supported for the selected Signet account."
          : null}
      </p>
    </div>
  )
}

export const SignSignetSubstrate: React.FC<Props> = ({ account, onApprove, onCancel, payload }) => {
  const { t } = useTranslation()

  const error = useMemo(() => {
    const jsonPayload = payload as SignerPayloadJSON
    return {
      // signet requires the method so that it can wrap it in a multi + proxy call
      call: !jsonPayload.genesisHash || !jsonPayload.method,
      // signet accounts only support the chain that the signet account is on.
      network: !jsonPayload.genesisHash || jsonPayload.genesisHash !== account.genesisHash,
    }
  }, [account.genesisHash, payload])

  return (
    <div className={"flex w-full flex-col gap-6"}>
      <SignetSignetError {...error} />
      {onCancel && (
        <Button className="w-full" onClick={onCancel}>
          {t("Cancel")}
        </Button>
      )}
      {!error.call && !error.network && (
        <Button className="w-full" onClick={onApprove} primary>
          {t("Approve in Signet")}
        </Button>
      )}
    </div>
  )
}
