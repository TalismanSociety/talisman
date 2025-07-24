import { useNetwork } from "@talismn/balances-react"
import { SolSigningRequest } from "extension-core"
import { FC, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { AppPill } from "@talisman/components/AppPill"
import { api } from "@ui/api"
import {
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupLayout,
} from "@ui/apps/popup/Layout/PopupLayout"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"

import { SignNetworkLogo } from "../SignNetworkLogo"

// const useEvmBalance = (address: EvmAddress, evmNetworkId: EthNetworkId | undefined) => {
//   const publicClient = usePublicClient(evmNetworkId)
//   return useEthBalance(publicClient, address)
// }

export const SolSignTransactionRequest: FC<{
  request: SolSigningRequest
}> = ({ request }) => {
  if (request.request.type !== "transaction")
    throw new Error("Invalid request type for SolSignTransactionRequest")

  const {
    id,
    account,
    // request: { transaction },
    // url,
  } = request

  const { t } = useTranslation()

  const [state, setState] = useState<{
    processing: boolean
    error: string | undefined
  }>({
    processing: false,
    error: undefined,
  })

  const handleApprove = async () => {
    setState({ error: undefined, processing: true })
    try {
      await api.solSignApprove(id) // will close the window automatically if successful
    } catch (error) {
      setState({
        processing: false,
        error: (error as Error).message || "Failed to approve sign request",
      })
    }
  }

  // const handleSubmit = useCallback((signature: string) => {}, [])

  // const isLoading = true

  // console.log({ request })

  const network = useNetwork("solana-mainnet")

  return (
    <PopupLayout>
      <PopupHeader right={<SignNetworkLogo network={network} />}>
        <AppPill url={request.url} />
      </PopupHeader>
      <PopupContent>
        <div className="text-body-secondary flex h-full w-full flex-col items-center text-center">
          <h1 className="text-body text-md my-12 font-bold leading-9">{t("Approve Request")}</h1>
          <h2 className="mb-8 text-base leading-[3.2rem]">
            {t("You are signing a transaction with account")} <AccountPill account={account} />
          </h2>
        </div>
      </PopupContent>

      <PopupFooter className="flex flex-col gap-8">
        {!!state.error && (
          <SignAlertMessage className="mb-6" type="error">
            {state.error}
          </SignAlertMessage>
        )}
        <div>fee</div>
        <div className="grid w-full grid-cols-2 gap-12">
          <Button
            //disabled={processing} onClick={reject}
            onClick={() => window.close()}
          >
            {t("Cancel")}
          </Button>
          <Button
            //   disabled={!transaction || isLoading || !isValid}
            processing={state.processing}
            primary
            onClick={handleApprove}
          >
            {t("Approve")}
          </Button>
          {/* <TxSubmitButtonSol onSubmit={} */}
        </div>
      </PopupFooter>
    </PopupLayout>
  )
}
