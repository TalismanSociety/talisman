import type { Account } from "@core/domains/keyring/exports"
import type { DotNetwork } from "@talismn/chaindata-provider"
import { UserRightIcon } from "@talismn/icons"
import type { SiwsMessage } from "@talismn/siws"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { AccountPill } from "@ui/domains/Account/AccountPill"
import { SignAlertMessage } from "@ui/domains/Sign/SignAlertMessage"
import { ViewDetailsAddress } from "@ui/domains/Sign/ViewDetails/ViewDetailsAddress"
import { ViewDetailsButton } from "@ui/domains/Sign/ViewDetails/ViewDetailsButton"
import { ViewDetailsField } from "@ui/domains/Sign/ViewDetails/ViewDetailsField"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

export type Props = {
  account: Account
  chain: DotNetwork | null | undefined
  request: SiwsMessage
  validationError: string | null
}

export const MessageSiws = ({ account, chain, request, validationError }: Props) => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  return (
    <div className="scrollable scrollable-800 flex h-full max-h-full w-full flex-col items-center overflow-auto">
      <div className="my-12 flex w-full flex-col items-center">
        <div className="rounded-full bg-grey-800 p-5">
          <UserRightIcon className="text-[1.75rem] text-primary" />
        </div>
        <div className="mt-8 font-bold text-lg">{t("Sign In")}</div>
        <div className="my-16 flex w-full flex-col items-center gap-3 overflow-hidden text-body-secondary">
          <div className="max-w-full truncate font-bold text-body">{request.domain}</div>
          <div className="text-body-secondary">{t("wants you to sign in with Substrate")}</div>
          <div className="flex max-w-full items-center justify-center gap-2 truncate [&>button>div>span]:font-bold [&>button>div>span]:text-body">
            <span>{t("with")}</span>
            <AccountPill account={account} ss58Format={chain?.prefix ?? undefined} />
          </div>
        </div>
        {!!request.statement && (
          <div className="mb-16 w-full rounded-sm bg-grey-850 p-4 text-sm">
            <div className="text-body-disabled text-xs">{t("Statement")}</div>
            <div className="mt-2 text-body leading-paragraph">{request.statement}</div>
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
  account: Account
  request: SiwsMessage
  onClose: () => void
}> = ({ account, request, onClose }) => {
  const { t } = useTranslation()
  const message = useMemo(() => request.prepareMessage(), [request])

  return (
    <div className="flex max-h-[37.5rem] w-full flex-col gap-12 bg-grey-850 p-12">
      <div className="scrollable scrollable-700 grow overflow-y-auto overflow-x-hidden pr-4 text-sm leading-[1.25rem]">
        <div className="text-body-secondary">{t("Details")}</div>
        <p>
          {t(
            "You are about to sign in via Substrate. Please ensure you trust the application before continuing."
          )}
        </p>
        <ViewDetailsAddress label={t("From")} address={account.address} network={null} />
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
            <pre className="scrollable scrollable-700 w-full overflow-x-auto rounded-xs bg-grey-800 p-4 text-body-secondary">
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
