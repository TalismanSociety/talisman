import { Chain } from "@extension/core"
import { AccountJsonAny } from "@extension/core"
import { UserRightIcon } from "@talismn/icons"
import { SiwsMessage } from "@talismn/siws"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { ViewDetailsAddress } from "@ui/domains/Sign/ViewDetails/ViewDetailsAddress"
import { ViewDetailsButton } from "@ui/domains/Sign/ViewDetails/ViewDetailsButton"
import { ViewDetailsField } from "@ui/domains/Sign/ViewDetails/ViewDetailsField"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer, useOpenClose } from "talisman-ui"

export type Props = {
  account: AccountJsonAny
  chain: Chain | null | undefined
  request: SiwsMessage
  validationError: string | null
}

export const MessageSiws = ({ account, chain, request, validationError }: Props) => {
  const { t } = useTranslation("request")
  const { isOpen, open, close } = useOpenClose()

  return (
    <div className="scrollable scrollable-800 flex h-full max-h-full w-full flex-col items-center overflow-auto">
      <div className="my-12 flex w-full flex-col items-center">
        <div className="bg-grey-800 rounded-full p-5">
          <UserRightIcon className="text-primary text-[2.8rem]" />
        </div>
        <div className="mt-8 text-lg font-bold">{t("Sign In")}</div>
        <div className="text-body-secondary my-16 flex w-full flex-col items-center gap-3 overflow-hidden">
          <div className="text-body max-w-full truncate font-bold">{request.domain}</div>
          <div className="text-body-secondary">{t("wants you to sign in with Substrate")}</div>
          <div className="[&>button>div>span]:text-body flex max-w-full items-center justify-center gap-2 truncate [&>button>div>span]:font-bold">
            <span>{t("with")}</span>
            <AccountPill account={account} prefix={chain?.prefix ?? undefined} />
          </div>
        </div>
        {!!request.statement && (
          <div className="bg-grey-850  mb-16 w-full rounded-sm p-4 text-sm">
            <div className="text-body-disabled text-xs">{t("Statement")}</div>
            <div className="text-body leading-paragraph mt-2">{request.statement}</div>
          </div>
        )}
        <ViewDetailsButton onClick={open} />
      </div>
      <div className="grow"></div>
      {validationError && (
        <SignAlertMessage type="error" className="mt-8">
          {t("Sign in domain or address is different from website domain or signer address.")}
        </SignAlertMessage>
      )}
      <Drawer anchor="bottom" containerId="main" isOpen={isOpen} onDismiss={close}>
        <ViewDetailsContent account={account} request={request} onClose={close} />
      </Drawer>
    </div>
  )
}

const ViewDetailsContent: FC<{
  account: AccountJsonAny
  request: SiwsMessage
  onClose: () => void
}> = ({ account, request, onClose }) => {
  const { t } = useTranslation("request")
  const message = useMemo(() => request.prepareMessage(), [request])

  return (
    <div className="bg-grey-850 flex max-h-[60rem] w-full flex-col gap-12 p-12">
      <div className="scrollable scrollable-700 flex-grow overflow-y-auto overflow-x-hidden pr-4 text-sm leading-[2rem]">
        <div className="text-body-secondary">{t("Details")}</div>
        <p>
          {t(
            "You are about to sign in via Substrate. Please ensure you trust the application before continuing."
          )}
        </p>
        <ViewDetailsAddress label={t("From")} address={account.address} />
        <ViewDetailsField label={t("Domain")}>{request.domain}</ViewDetailsField>
        <ViewDetailsField label={t("Statement")}>{request.statement}</ViewDetailsField>
        {request.chainId && (
          <ViewDetailsField label={t("ChainId")}>{request.chainId}</ViewDetailsField>
        )}
        {request.chainName && (
          <ViewDetailsField label={t("Chain Name")}>{request.chainName}</ViewDetailsField>
        )}
        <ViewDetailsField label={t("Nonce")}>{request.nonce}</ViewDetailsField>
        <ViewDetailsField label={t("Issued At")}>{request.issuedAt}</ViewDetailsField>
        <ViewDetailsField label={t("Expires At")}>{request.expirationTime}</ViewDetailsField>
        <ViewDetailsField label={t("Message")}>
          <div className="mt-2 pr-2">
            <pre className="text-body-secondary scrollable scrollable-700 bg-grey-800 rounded-xs w-full overflow-x-auto p-4">
              {message}
            </pre>
          </div>
        </ViewDetailsField>
      </div>
      <Button className="shrink-0" onClick={onClose}>
        {t("Close")}
      </Button>
    </div>
  )
}
