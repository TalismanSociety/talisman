import { CustomErc20Token } from "@core/domains/tokens/types"
import * as Sentry from "@sentry/browser"
import Dialog from "@talisman/components/Dialog"
import { FormField } from "@talisman/components/Field/FormField"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { IconAlert } from "@talisman/theme/icons"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { NetworkSelect } from "@ui/domains/Ethereum/NetworkSelect"
import { useCustomErc20Token } from "@ui/hooks/useCustomErc20Token"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import styled from "styled-components"

import { ErrorDiv, Footer, Split, SymbolPrefix, commonFormStyle } from "./CustomTokensComponents"

const Form = styled.div`
  ${commonFormStyle}
`

const ConfirmRemove = ({
  open,
  token,
  onClose,
}: {
  open?: boolean
  token: CustomErc20Token
  onClose: () => void
}) => {
  const navigate = useNavigate()

  // keep last one to prevent symbol to disappear when deleting it
  const [saved, setSaved] = useState<CustomErc20Token>()
  useEffect(() => {
    if (token) setSaved(token)
  }, [token])

  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string>()
  const handleRemove = useCallback(async () => {
    setConfirming(true)
    setError(undefined)
    try {
      await api.removeCustomErc20Token(token.id)
      navigate("/tokens")
    } catch (err) {
      Sentry.captureException(err)
      setError((err as Error).message ?? "Unknown error")
      setConfirming(false)
    }
  }, [navigate, token.id])

  return (
    <Modal open={Boolean(open && saved)} onClose={onClose}>
      <ModalDialog title="Remove Token" onClose={onClose}>
        <Dialog
          icon={<IconAlert />}
          title="Are you sure?"
          text={`Token ${saved?.symbol} balances will be hidden in all your accounts.`}
          extra={<ErrorDiv>{error}</ErrorDiv>}
          confirmText="Remove"
          cancelText="Cancel"
          confirming={confirming}
          onConfirm={handleRemove}
          onCancel={onClose}
        />
      </ModalDialog>
    </Modal>
  )
}

export const CustomTokenDetails = () => {
  const { id } = useParams<"id">()
  const { isOpen, open, close } = useOpenClose()
  const navigate = useNavigate()

  const token = useCustomErc20Token(id)
  const network = useEvmNetwork(token?.evmNetwork?.id)

  useEffect(() => {
    // if token doesn't exist, redirect to tokens page
    if (token === null) navigate("/tokens")
  }, [token, navigate])

  // prevent flickering while loading
  if (!token || !network) return null

  return (
    <Layout withBack centered>
      <HeaderBlock
        title={`${token.symbol} on ${network.name}`}
        text="Tokens can be created by anyone and named however they like, even to imitate existing tokens. Always ensure you have verified the token address before adding a custom token."
      />
      <Form>
        <FormField label="Network">
          <NetworkSelect
            defaultChainId={token?.evmNetwork?.id}
            // disabling network edit because it would create a new token
            disabled={Boolean(id)}
          />
        </FormField>
        <FormField label="Contract Address">
          <input
            type="text"
            value={token.contractAddress}
            spellCheck={false}
            data-lpignore
            autoComplete="off"
            // a token cannot change address
            disabled
          />
        </FormField>
        <Split>
          <FormField label="Symbol" prefix={<SymbolPrefix token={token} />}>
            <input type="text" value={token.symbol} autoComplete="off" disabled />
          </FormField>
          <FormField label="Decimals">
            <input
              type="number"
              value={token.decimals}
              placeholder="0"
              autoComplete="off"
              disabled
            />
          </FormField>
        </Split>
        <Footer>
          <SimpleButton type="button" primary onClick={open}>
            Remove Token
          </SimpleButton>
        </Footer>
      </Form>
      <ConfirmRemove open={isOpen} onClose={close} token={token} />
    </Layout>
  )
}
