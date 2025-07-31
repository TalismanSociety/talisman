import { createSignInMessageText } from "@solana/wallet-standard-util"
import { InfoIcon } from "@talismn/icons"
import { isAccountPlatformSolana, KnownRequestIdOnly, ProviderType } from "extension-core"
import { capitalize } from "lodash-es"
import { FC, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { Button, Drawer } from "talisman-ui"

import { AppPill } from "@talisman/components/AppPill"
import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { Message } from "@ui/domains/Sign/Message"
import { MsgSignButton } from "@ui/domains/Sign/MsgSignButton/MsgSignButton"
import { MsgSignButtonPayloadSol } from "@ui/domains/Sign/MsgSignButton/types"
import { ConnectAccountsContainer } from "@ui/domains/Site/ConnectAccountsContainer"
import { ConnectAccountToggleButtonRow } from "@ui/domains/Site/ConnectAccountToggleButtonRow"
import { useAccounts, useRequest } from "@ui/state"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../../../Layout/PopupLayout"

export const SolanaSignInPage: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const { id } = useParams<"id">() as KnownRequestIdOnly<"auth-sol-signIn">

  const signInRequest = useRequest(id)

  const [address, setAddress] = useState<string>()
  const accounts = useAccounts("owned")
  const solanaAccounts = useMemo(() => accounts.filter(isAccountPlatformSolana), [accounts])

  const message = useMemo(() => {
    if (!address || !signInRequest) return null
    return createSignInMessageText({
      ...signInRequest.input,
      address,
      domain: new URL(signInRequest.url).host,
    })
  }, [address, signInRequest])

  useEffect(() => {
    if (!signInRequest) window.close()
  }, [signInRequest])

  const signPayload = useMemo(
    () =>
      address && message
        ? ({
            platform: "solana",
            address: address ?? "",
            message: new TextEncoder().encode(message),
          } as MsgSignButtonPayloadSol)
        : null,
    [message, address],
  )

  const handleSubmit = useCallback(
    async (signature?: string) => {
      if (!signInRequest || !address || !message) return

      try {
        await api.authrequestApproveSolSignIn(signInRequest.id, {
          address,
          message,
          signature,
        })
      } catch (err) {
        notify({ type: "error", title: t("Failed to connect"), subtitle: (err as Error).message })
      }
    },
    [address, message, signInRequest, t],
  )

  const handleReject = useCallback(() => {
    window.close()
  }, [])

  if (!signInRequest) return null

  return (
    <PopupLayout className={className}>
      <PopupHeader>
        <AppPill url={signInRequest.url} />
      </PopupHeader>
      <PopupContent>
        <div className="text-body-secondary flex h-full w-full flex-col items-center gap-8 text-center">
          <h1 className="text-body text-md my-4 font-bold leading-9">{t("Sign In Request")}</h1>
          <div className="flex w-full flex-col gap-8 px-4 text-left">
            <ConnectAccountsContainer
              status="disabled"
              connectedAddresses={[]}
              label={t("Solana")}
              infoText={t(`Account will be connected via the Solana provider`)}
              isSingleProvider
            >
              {solanaAccounts.map((acc, idx) => (
                <Fragment key={acc.address}>
                  {!!idx && <AccountSeparator />}
                  <ConnectAccountToggleButtonRow
                    account={acc}
                    showAddress
                    checked={address === acc.address}
                    onClick={() => setAddress(acc.address)}
                  />
                </Fragment>
              ))}
            </ConnectAccountsContainer>
            {!!message && <MessageContainer text={message} />}
            {!accounts.length && (
              <NoAccountWarning
                type={"polkadot"}
                onIgnoreClick={() => window.close()}
                onAddAccountClick={async () => {
                  await api.dashboardOpen("/accounts/add")
                  window.close()
                }}
              />
            )}
          </div>
        </div>
      </PopupContent>
      <PopupFooter>
        <div className="grid w-full grid-cols-2 gap-12">
          <Button onClick={handleReject} data-testid="connection-reject-button">
            {t("Reject")}
          </Button>
          <MsgSignButton
            onSubmit={handleSubmit}
            payload={signPayload}
            containerId="main"
            label={"Sign In"}
          />
        </div>
      </PopupFooter>
    </PopupLayout>
  )
}

const MessageContainer: FC<{ text: string }> = ({ text }) => {
  const { t } = useTranslation()
  const refContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    refContainer.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  return (
    <div ref={refContainer} className="flex w-full flex-col gap-4">
      <div className="px-4 text-sm">{t("Sign in message:")}</div>
      <Message className="w-full text-sm" text={text} rows={6} />
    </div>
  )
}

const AccountSeparator = () => <div className="bg-grey-800 mx-6 h-0.5"></div>

const NoAccountWarning = ({
  onIgnoreClick,
  onAddAccountClick,
  type,
}: {
  type: ProviderType
  onIgnoreClick: () => void
  onAddAccountClick: () => void
}) => {
  const { t } = useTranslation()
  return (
    <Drawer isOpen anchor="bottom" containerId="main">
      <div className="bg-grey-800 flex flex-col gap-8 rounded-t-xl p-12">
        <div className="w-full text-center">
          <InfoIcon className="text-primary-500 inline-block text-[4rem]" />
        </div>
        <p className="text-body-secondary text-center">
          <Trans
            t={t}
            defaults="This application requires a <br/><strong>{{type}} account</strong> to connect.<br/>Would you like to create or import one?"
            components={{ strong: <strong className="text-body" />, br: <br /> }}
            values={{ type: capitalize(type) }}
          />
        </p>
        <div className="mt-4 grid grid-cols-2 gap-8">
          <Button onClick={onIgnoreClick}>{t("No")}</Button>
          <Button primary onClick={onAddAccountClick}>
            {t("Yes")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
