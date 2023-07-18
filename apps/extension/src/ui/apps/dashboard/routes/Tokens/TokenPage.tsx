import { Erc20Token } from "@core/domains/tokens/types"
import * as Sentry from "@sentry/browser"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import { AssetLogoBase } from "@ui/domains/Asset/AssetLogo"
import { NetworkSelect } from "@ui/domains/Ethereum/NetworkSelect"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { isCustomErc20Token } from "@ui/util/isCustomErc20Token"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

const ConfirmRemove = ({
  open,
  token,
  onClose,
}: {
  open?: boolean
  token: Erc20Token
  onClose: () => void
}) => {
  const { t } = useTranslation("admin")
  const navigate = useNavigate()

  // keep last one to prevent symbol to disappear when deleting it
  const [saved, setSaved] = useState<Erc20Token>()
  useEffect(() => {
    if (token) setSaved(token)
  }, [token])

  const [confirming, setConfirming] = useState(false)
  const handleRemove = useCallback(async () => {
    setConfirming(true)
    try {
      if (!isCustomErc20Token(token)) throw new Error(t("Cannot remove built-in tokens"))
      await api.removeCustomErc20Token(token.id)
      navigate("/tokens")
    } catch (err) {
      Sentry.captureException(err)
      notify({
        type: "error",
        title: t("Error"),
        subtitle: (err as Error).message ?? t("Failed to remove"),
      })
      setConfirming(false)
    }
  }, [navigate, token, t])

  return (
    <Modal isOpen={Boolean(open && saved)} onDismiss={onClose}>
      <ModalDialog title={t("Remove Token")} onClose={onClose}>
        <div className="text-body-secondary mt-4 space-y-16">
          <div className="text-base">
            <Trans t={t}>
              Are you sure you want to remove <span className="text-body">{saved?.symbol}</span>{" "}
              from your token list ?
            </Trans>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <Button onClick={onClose}>{t("Cancel")}</Button>
            <Button primary onClick={handleRemove} processing={confirming}>
              {t("Remove")}
            </Button>
          </div>
        </div>
      </ModalDialog>
    </Modal>
  )
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Token Details",
}

export const TokenPage = () => {
  const { t } = useTranslation("admin")
  const { id } = useParams<"id">()
  const { isOpen, open, close } = useOpenClose()
  const navigate = useNavigate()

  useAnalyticsPageView(ANALYTICS_PAGE, { id })

  const token = useToken(id)
  const erc20Token = useMemo(
    () => (token?.type === "evm-erc20" ? (token as Erc20Token) : undefined),
    [token]
  )
  const network = useEvmNetwork(erc20Token?.evmNetwork?.id)

  useEffect(() => {
    // if token doesn't exist, redirect to tokens page
    if (token === null) navigate("/tokens")
  }, [token, navigate])

  // prevent flickering while loading
  if (!erc20Token || !network) return null

  return (
    <DashboardLayout analytics={ANALYTICS_PAGE} withBack centered>
      <HeaderBlock
        title={t("{{tokenSymbol}} on {{networkName}}", {
          tokenSymbol: erc20Token.symbol,
          networkName: network.name,
        })}
        text={
          isCustomErc20Token(erc20Token)
            ? t(
                "Tokens can be created by anyone and named however they like, even to imitate existing tokens. Always ensure you have verified the token address before adding a custom token."
              )
            : t("This ERC-20 token is supported by Talisman by default. It can't be removed.")
        }
      />
      <form className="my-20 space-y-4">
        <FormFieldContainer label="Network">
          <NetworkSelect
            withTestnets
            defaultChainId={network.id}
            // disabling network edit because it would create a new token
            disabled={Boolean(id)}
            className="w-full"
          />
        </FormFieldContainer>
        <FormFieldContainer label={t("Contract Address")}>
          <FormFieldInputText
            type="text"
            value={erc20Token.contractAddress}
            spellCheck={false}
            data-lpignore
            autoComplete="off"
            // a token cannot change address
            disabled
            small
          />
        </FormFieldContainer>
        <div className="grid grid-cols-2 gap-12">
          <FormFieldContainer label={t("Symbol")}>
            <FormFieldInputText
              type="text"
              value={erc20Token.symbol}
              autoComplete="off"
              disabled
              small
              before={
                token && (
                  <AssetLogoBase className="ml-[-0.8rem] mr-2 text-[3rem]" url={token?.logo} />
                )
              }
            />
          </FormFieldContainer>
          <FormFieldContainer label={t("Decimals")}>
            <FormFieldInputText
              type="number"
              value={erc20Token.decimals}
              placeholder="0"
              autoComplete="off"
              disabled
              small
            />
          </FormFieldContainer>
        </div>
        <div className="flex justify-end py-8">
          <Button
            className="h-24 w-[24rem] text-base"
            disabled={!isCustomErc20Token(erc20Token)}
            type="button"
            primary
            onClick={open}
          >
            {t("Remove Token")}
          </Button>
        </div>
      </form>
      <ConfirmRemove open={isOpen} onClose={close} token={erc20Token} />
    </DashboardLayout>
  )
}
