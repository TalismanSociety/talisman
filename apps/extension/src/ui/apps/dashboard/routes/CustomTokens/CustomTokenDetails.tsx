import { Erc20Token } from "@core/domains/tokens/types"
import * as Sentry from "@sentry/browser"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import Layout from "@ui/apps/dashboard/layout"
import { NetworkSelect } from "@ui/domains/Ethereum/NetworkSelect"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { isCustomErc20Token } from "@ui/util/isCustomErc20Token"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"

const ConfirmRemove = ({
  open,
  token,
  onClose,
}: {
  open?: boolean
  token: Erc20Token
  onClose: () => void
}) => {
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
      if (!isCustomErc20Token(token)) throw new Error("Cannot remove built-in tokens")
      await api.removeCustomErc20Token(token.id)
      navigate("/tokens")
    } catch (err) {
      Sentry.captureException(err)
      notify({
        type: "error",
        title: "Error",
        subtitle: (err as Error).message ?? "Failed to remove",
      })
      setConfirming(false)
    }
  }, [navigate, token])

  return (
    <Modal open={Boolean(open && saved)} onClose={onClose}>
      <ModalDialog title="Remove Token" onClose={onClose}>
        <div className="text-body-secondary mt-4 space-y-16">
          <div className="text-base">
            Are you sure you want to remove <span className="text-body">{saved?.symbol}</span> from
            your token list ?
          </div>
          <div className="grid grid-cols-2 gap-8">
            <Button onClick={onClose}>Cancel</Button>
            <Button primary onClick={handleRemove} processing={confirming}>
              Remove
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

export const CustomTokenDetails = () => {
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
    <Layout analytics={ANALYTICS_PAGE} withBack centered>
      <HeaderBlock
        title={`${erc20Token.symbol} on ${network.name}`}
        text={
          isCustomErc20Token(erc20Token)
            ? "Tokens can be created by anyone and named however they like, even to imitate existing tokens. Always ensure you have verified the token address before adding a custom token."
            : "This ERC-20 token is supported by Talisman by default. It can't be removed."
        }
      />
      <form className="my-20 space-y-4">
        <FormFieldContainer label="Network">
          <NetworkSelect
            defaultChainId={network.id}
            // disabling network edit because it would create a new token
            disabled={Boolean(id)}
            className="w-full"
          />
        </FormFieldContainer>
        <FormFieldContainer label="Contract Address">
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
          <FormFieldContainer label="Symbol">
            <FormFieldInputText
              type="text"
              value={erc20Token.symbol}
              autoComplete="off"
              disabled
              small
              before={
                null //TODO MERGE
                // token && (
                //   <TokenImage
                //     className="mr-2 ml-[-0.8rem] text-[3rem]"
                //     src={"image" in token ? token.image : GENERIC_TOKEN_LOGO_URL}
                //   />
                // )
              }
            />
          </FormFieldContainer>
          <FormFieldContainer label="Decimals">
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
            Remove Token
          </Button>
        </div>
      </form>
      <ConfirmRemove open={isOpen} onClose={close} token={erc20Token} />
    </Layout>
  )
}
