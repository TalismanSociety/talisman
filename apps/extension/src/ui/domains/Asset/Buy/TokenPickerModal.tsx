import { Token } from "@core/domains/tokens/types"
import { Box } from "@talisman/components/Box"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { SearchIcon } from "@talisman/theme/icons"
import { scrollbarsStyle } from "@talisman/theme/styles"
import useTokens from "@ui/hooks/useTokens"
import {
  ButtonHTMLAttributes,
  ChangeEventHandler,
  DetailedHTMLProps,
  useCallback,
  useState,
} from "react"
import { useDebounce } from "react-use"
import styled from "styled-components"

import { useTransferableTokenById } from "../Send/useTransferableTokens"
import { TokenLogo } from "../TokenLogo"

type TokenButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  token: Token
}

const Button = styled.button`
  background: var(--color-background-muted);
  border: none;
  cursor: pointer;
  color: var(--color-mid);
  :hover {
    background: var(--color-background-muted-3x);
    color: var(--color-foreground-muted);
  }
`

const TokenButton = ({ token, onClick }: TokenButtonProps) => {
  return (
    <Button type="button" onClick={onClick}>
      <Box flex>
        <Box padding="1.6rem" fontsize="xlarge">
          <TokenLogo tokenId={token.id} />
        </Box>
        <Box grow flex column justify="center" gap={0.4}>
          <Box fontsize="normal" bold flex inline align="center" gap={0.6}>
            {token.symbol}
            {/* {isFetching && <FetchingIcon data-spin />} */}
          </Box>
          {/* {!!networkIds.length && (
            <div>
              <NetworksLogoStack networkIds={networkIds} />
            </div>
          )} */}
        </Box>
      </Box>
    </Button>
  )
}

type TokenPickerFormProps = {
  onTokenSelect?: (symbol: string) => void
}

const FormContainer = styled(Box)`
  .tokens-scroll {
    ${scrollbarsStyle("var(--color-background-muted-2x)")}
  }

  input {
    flex-grow: 1;
    background: none;
    border: none;
    color: var(--color-mid);
  }
`

export const TokenPickerForm = ({ onTokenSelect }: TokenPickerFormProps) => {
  const [search, setSearch] = useState<string>()
  const allTokens = useTokens()

  const handleSearchChanged: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setSearch(e.target.value)
  }, [])

  const [tokens, setTokens] = useState<Token[]>(allTokens ?? [])
  const updateTokens = useCallback(() => {
    const lower = search?.toLowerCase()
    setTokens(
      allTokens?.filter(
        ({ symbol, chain }) =>
          !lower ||
          [symbol, chain?.id].filter(Boolean).some((str) => str?.toLowerCase().includes(lower))
      ) ?? []
    )
  }, [allTokens, search])

  useDebounce(updateTokens, 100, [updateTokens])

  const handleTokenClick = useCallback(
    (symbol: string) => () => {
      onTokenSelect?.(symbol)
    },
    [onTokenSelect]
  )

  return (
    <FormContainer>
      <Box
        h={5.6}
        gap={0.8}
        padding="0 2rem 0 2rem"
        flex
        bg="background-muted"
        fg="mid"
        align="middle"
        margin={2}
        borderradius="small"
      >
        <Box flex column justify={"center"} fontsize="large" fg="background-muted-2x">
          <SearchIcon />
        </Box>
        <input placeholder="Search by name or network" type="text" onChange={handleSearchChanged} />
      </Box>
      <Box
        className="tokens-scroll"
        bg="background-muted"
        fullwidth
        flex
        column
        overflow="auto"
        h={37}
      >
        {tokens?.map((t) => (
          <TokenButton key={t.id} token={t} onClick={handleTokenClick(t.id)} />
        ))}
      </Box>
    </FormContainer>
  )
}

const Dialog = styled(ModalDialog)`
  border: 1px solid #262626;
  > header {
    color: var(--color-mid);
  }
  > .content {
    padding: 0;
    /* background: var(--color-background-muted-3x);
    */

    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
`

type TokenPickerModalProps = {
  isOpen: boolean
  close?: () => void
}

export const TokenPickerModal = ({ isOpen, close }: TokenPickerModalProps) => {
  //const { isOpen, close } = useTokenPickerModal()

  return (
    <Modal open={isOpen} onClose={close}>
      <Dialog title="Select a token" onClose={close}>
        <TokenPickerForm />
      </Dialog>
    </Modal>
  )
}
