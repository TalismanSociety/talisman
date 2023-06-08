import { Balances } from "@core/domains/balances/types"
import { Token } from "@core/domains/tokens/types"
import { Box } from "@talisman/components/Box"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { LoaderIcon, SearchIcon } from "@talisman/theme/icons"
import { scrollbarsStyle } from "@talisman/theme/styles"
import { planckToTokens } from "@talismn/util"
import useBalances from "@ui/hooks/useBalances"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { getNetworkInfo } from "@ui/hooks/useNetworkInfo"
import { useSetting } from "@ui/hooks/useSettings"
import useTokens from "@ui/hooks/useTokens"
import {
  ButtonHTMLAttributes,
  ChangeEventHandler,
  DetailedHTMLProps,
  useCallback,
  useMemo,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { useDebounce } from "react-use"
import styled from "styled-components"

import Fiat from "./Fiat"
import { TokenLogo } from "./TokenLogo"
import Tokens from "./Tokens"

type TokenProps = {
  token: Token
  balances: Balances
  network: { label: string | null; type: string }
}

type TokenButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> &
  TokenProps

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

const FetchingIcon = styled(LoaderIcon)`
  line-height: 1;
  font-size: 2rem;
`

const TokenButton = ({ token, balances, network, onClick }: TokenButtonProps) => {
  const { isFetching, totalTokens, totalFiat } = useMemo(
    () => ({
      isFetching: balances.sorted.some((b) => b.status === "cache"),
      totalTokens: balances.sorted.reduce(
        (prev, balance) => prev + balance.transferable.planck,
        0n
      ),
      totalFiat: balances.sum.fiat("usd").transferable,
    }),
    [balances]
  )

  return (
    <Button type="button" onClick={onClick}>
      <Box flex fg="foreground">
        <Box padding="1.6rem" fontsize="xlarge">
          <TokenLogo tokenId={token.id} />
        </Box>
        <Box grow textalign="left" flex column justify="center" gap={0.4}>
          <Box fontsize="small" bold flex gap={0.6}>
            {token.symbol}
            {isFetching && <FetchingIcon className="animate-spin-slow" />}
          </Box>
          <Box fontsize="xsmall" fg="mid">
            {network.label}
          </Box>
        </Box>
        <Box textalign="right" flex column justify="center" gap={0.4} padding="0 0.4rem 0 0">
          <Box>
            <Tokens
              amount={planckToTokens(totalTokens.toString(), token.decimals)}
              symbol={token?.symbol}
              isBalance
            />
          </Box>
          <Box fg="mid">
            <Fiat amount={totalFiat} currency="usd" isBalance noCountUp />
          </Box>
        </Box>
      </Box>
    </Button>
  )
}

type TokenPickerFormProps = {
  filter?: (token: Token) => boolean
  onTokenSelect?: (tokenId: string) => void
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

const TokenPickerForm = ({ filter, onTokenSelect }: TokenPickerFormProps) => {
  const [useTestnets] = useSetting("useTestnets")
  const { chainsMap } = useChains(useTestnets)
  const { evmNetworksMap } = useEvmNetworks(useTestnets)
  const allBalances = useBalances()

  const { t: tCommon } = useTranslation()

  const { tokens: allTokens } = useTokens(useTestnets)
  const allowedTokens = useMemo(
    () =>
      (filter && allTokens ? allTokens.filter(filter) : allTokens ?? [])
        .sort((t1, t2) => {
          const chain1 = chainsMap[t1.chain?.id as string]
          const chain2 = chainsMap[t2.chain?.id as string]
          return (
            (chain1?.sortIndex || Number.MAX_SAFE_INTEGER) -
            (chain2?.sortIndex || Number.MAX_SAFE_INTEGER)
          )
        })
        .map<TokenProps>((token) => {
          const chain = chainsMap[token.chain?.id as string]
          const evmNetwork = evmNetworksMap[String("evmNetwork" in token && token.evmNetwork?.id)]
          const relay = chain?.relay?.id ? chainsMap[chain?.relay?.id] : undefined
          const network = getNetworkInfo(tCommon, { chain, evmNetwork, relay })

          const balances = new Balances(allBalances.find({ tokenId: token.id }))

          return {
            token,
            network,
            balances,
          }
        }),
    [filter, allTokens, chainsMap, evmNetworksMap, tCommon, allBalances]
  )
  const [search, setSearch] = useState<string>()
  const handleSearchChanged: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setSearch(e.target.value)
  }, [])

  const [tokens, setTokens] = useState<TokenProps[]>(allowedTokens ?? [])
  const updateTokens = useCallback(() => {
    const lower = search?.toLowerCase()
    setTokens(
      allowedTokens?.filter(
        ({ token, network }) =>
          !lower ||
          [token.symbol, network?.label]
            .filter(Boolean)
            .some((str) => str?.toLowerCase().includes(lower))
      ) ?? []
    )
  }, [allowedTokens, search])

  useDebounce(updateTokens, 100, [updateTokens])

  const handleTokenClick = useCallback(
    (tokenId: string) => () => {
      onTokenSelect?.(tokenId)
    },
    [onTokenSelect]
  )

  const { t } = useTranslation()

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
        margin="0 2rem 2rem 2rem"
        borderradius="small"
      >
        <Box flex column justify={"center"} fontsize="large" fg="background-muted-2x">
          <SearchIcon />
        </Box>
        <input
          placeholder={t("Search by name or network")}
          type="text"
          onChange={handleSearchChanged}
        />
      </Box>
      <Box
        className="tokens-scroll"
        bg="background-muted"
        fullwidth
        flex
        column
        overflow="hidden scroll"
        h={37}
      >
        {tokens?.map((props) => (
          <TokenButton key={props.token.id} {...props} onClick={handleTokenClick(props.token.id)} />
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
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
`

type TokenPickerModalProps = {
  isOpen: boolean
  close?: () => void
  filter?: (token: Token) => boolean
  onTokenSelect: (tokenId: string) => void
}

export const TokenPickerModal = ({
  isOpen,
  close,
  filter,
  onTokenSelect,
}: TokenPickerModalProps) => {
  const { t } = useTranslation("asset")

  return (
    <Modal open={isOpen} onClose={close}>
      <Dialog title={t("Select a token")} onClose={close}>
        <TokenPickerForm filter={filter} onTokenSelect={onTokenSelect} />
      </Dialog>
    </Modal>
  )
}
