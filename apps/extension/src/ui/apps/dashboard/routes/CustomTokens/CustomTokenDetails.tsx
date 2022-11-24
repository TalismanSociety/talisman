import { Erc20Token } from "@core/domains/tokens/types"
import * as Sentry from "@sentry/browser"
import { FormField } from "@talisman/components/Field/FormField"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { NetworkSelect } from "@ui/domains/Ethereum/NetworkSelect"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { isCustomErc20Token } from "@ui/util/isCustomErc20Token"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import styled from "styled-components"
import { Button } from "talisman-ui"

import { Footer, Split, SymbolPrefix, commonFormStyle } from "./CustomTokensComponents"

const Form = styled.div`
  ${commonFormStyle}
`

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
  const [error, setError] = useState<string>()
  const handleRemove = useCallback(async () => {
    setConfirming(true)
    setError(undefined)
    try {
      if (!isCustomErc20Token(token)) throw new Error("Cannot remove built-in tokens")
      await api.removeCustomErc20Token(token.id)
      navigate("/tokens")
    } catch (err) {
      Sentry.captureException(err)
      setError((err as Error).message ?? "Unknown error")
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
            <Button primary onClick={handleRemove}>
              Remove
            </Button>
          </div>
        </div>
      </ModalDialog>
    </Modal>
  )
}

export const CustomTokenDetails = () => {
  const { id } = useParams<"id">()
  const { isOpen, open, close } = useOpenClose()
  const navigate = useNavigate()

  const token = useToken(id)
  const erc20Token = useMemo(
    () => (token?.type === "erc20" ? (token as Erc20Token) : undefined),
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
    <Layout withBack centered>
      <HeaderBlock
        title={`${erc20Token.symbol} on ${network.name}`}
        text={
          isCustomErc20Token(erc20Token)
            ? "This ERC-20 token is supported by Talisman by default. It can't be removed."
            : "Tokens can be created by anyone and named however they like, even to imitate existing tokens. Always ensure you have verified the token address before adding a custom token."
        }
      />
      <Form>
        <FormField label="Network">
          <NetworkSelect
            defaultChainId={network.id}
            // disabling network edit because it would create a new token
            disabled={Boolean(id)}
          />
        </FormField>
        <FormField label="Contract Address">
          <input
            type="text"
            value={erc20Token.contractAddress}
            spellCheck={false}
            data-lpignore
            autoComplete="off"
            // a token cannot change address
            disabled
          />
        </FormField>
        <Split>
          <FormField label="Symbol" prefix={<SymbolPrefix token={erc20Token} />}>
            <input type="text" value={erc20Token.symbol} autoComplete="off" disabled />
          </FormField>
          <FormField label="Decimals">
            <input
              type="number"
              value={erc20Token.decimals}
              placeholder="0"
              autoComplete="off"
              disabled
            />
          </FormField>
        </Split>
        <Footer>
          <SimpleButton
            disabled={!isCustomErc20Token(erc20Token)}
            type="button"
            primary
            onClick={open}
          >
            Remove Token
          </SimpleButton>
        </Footer>
      </Form>
      <ConfirmRemove open={isOpen} onClose={close} token={erc20Token} />
    </Layout>
  )
}
