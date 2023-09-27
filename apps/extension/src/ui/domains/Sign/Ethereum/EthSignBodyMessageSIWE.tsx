import { AccountJsonAny } from "@core/domains/accounts/types"
import { EthSignRequest } from "@core/domains/signing/types"
import { log } from "@core/log"
import { ParsedMessage } from "@spruceid/siwe-parser"
import { UserRightIcon } from "@talismn/icons"
import { NetworkLogo } from "@ui/domains/Ethereum/NetworkLogo"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignAlertMessage } from "../SignAlertMessage"
import { SignParamAccountButton } from "./shared"

export const EthSignBodyMessageSIWE: FC<{
  account: AccountJsonAny
  request: EthSignRequest
  siwe: ParsedMessage
}> = ({ account, request, siwe }) => {
  const { t } = useTranslation("request")
  const evmNetwork = useEvmNetwork(String(siwe.chainId))

  const isValidUrl = useMemo(() => {
    try {
      const siweUrl = new URL(siwe.uri)
      const currUrl = new URL(request.url)
      return siweUrl.origin === currUrl.origin
    } catch (err) {
      log.error(err)
      return false
    }
  }, [siwe, request])

  return (
    <div className="flex h-full w-full flex-col">
      <div className="my-12 flex w-full flex-col items-center">
        <div className="bg-grey-800 rounded-full p-5">
          <UserRightIcon className="text-primary text-[2.8rem]" />
        </div>
        <div className="mt-8 text-lg font-bold">{t("Sign In")}</div>
        <div className="text-body-secondary my-16 flex w-full flex-col items-center gap-3 overflow-hidden">
          <div className="text-body max-w-full truncate font-bold">{siwe.domain}</div>
          <div className="text-body-secondary">{t("wants you to sign in with Ethereum")}</div>
          <div className="[&>button>div>span]:text-body flex max-w-full items-center justify-center truncate [&>button>div>span]:font-bold">
            <span>{t("with")}</span>
            <SignParamAccountButton address={account.address} withIcon />
          </div>
          {evmNetwork && (
            <div className="flex max-w-full items-center justify-center truncate">
              <span>{t("on")}</span>
              <NetworkLogo className="mx-3 shrink-0" ethChainId={evmNetwork?.id} />
              <span className="text-body truncate font-bold">{evmNetwork?.name}</span>
            </div>
          )}
        </div>
      </div>
      <div className="grow"></div>
      {!isValidUrl && (
        <SignAlertMessage type="error" className="mt-8">
          {t("Sign in domain is different from website domain.")}
        </SignAlertMessage>
      )}
    </div>
  )
}
