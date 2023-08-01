import { log } from "@core/log"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { BalanceFormatter, Balances } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { classNames, isEthereumAddress } from "@talismn/util"
import { api } from "@ui/api"
import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import Fiat from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import Tokens from "@ui/domains/Asset/Tokens"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useBalancesByParams, { BalanceByParamsProps } from "@ui/hooks/useBalancesByParams"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import useTokens from "@ui/hooks/useTokens"
import { useDcentAccountInfo, useDcentAddress } from "@ui/util/dcent"
import { isSubToken } from "@ui/util/isSubToken"
import DcentWebConnector from "dcent-web-connector"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useOpenClose } from "talisman-ui"

// TODO move to chaindata
const DCENT_COIN_NAME_TO_TOKEN_ID: Record<string, string> = {
  "POLYGON": "137-evm-native-matic",
  "0X2791BCA1F2DE4": "137-evm-erc20-0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
  "POLKADOT": "polkadot-substrate-native-dot",
  // "KUSAMA": "kusama-substrate-native-dot", unsupported dcent side
  "BSC": "56-evm-native-bnb",
}

const getDcentCoinTypeFromToken = (token: Token) => {
  if (!token) return undefined

  switch (token.type) {
    case "evm-erc20":
    case "evm-native":
      return DcentWebConnector.coinType.ETHEREUM
    case "substrate-native":
      return DcentWebConnector.coinType.POLKADOT
    default: {
      // TODO sentry
      log.warn("Unsupported D'CENT token type : " + token.id)
    }
  }
}

type DcentAccountInfo = {
  name: string
  coinType: string
  derivationPath: string
  tokens: Token[]
}

const AccountToken: FC<{ address: string; token: Token; balances: Balances }> = ({
  address,
  token,
  balances,
}) => {
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)
  const chain = useChain(token?.chain?.id)
  const tokenRate = useTokenRates(token.id)

  const { balance, isLoading } = useMemo(() => {
    const accountTokenBalances = balances.find({ tokenId: token.id, address })
    const free = accountTokenBalances.each.reduce((total, b) => total + b.free.planck, 0n)

    return {
      balance: new BalanceFormatter(free, token.decimals, tokenRate),
      isLoading:
        !accountTokenBalances.count || accountTokenBalances.each.some((b) => b.status !== "live"),
    }
  }, [address, balances, token.decimals, token.id, tokenRate])

  return (
    <div className="text-body-secondary bg-grey-900 mt-4 flex h-[4.8rem] items-center gap-4 rounded-sm px-8">
      <TokenLogo className="text-lg" tokenId={token.id} />
      <div className="flex grow flex-col gap-1">
        <div className="text-body text-sm">{token.symbol}</div>
        <div className="text-body-secondary text-xs">{chain?.name ?? evmNetwork?.name}</div>
      </div>
      <div className={classNames("flex flex-col gap-1 text-right", isLoading && "animate-pulse")}>
        <div className="text-body text-sm">
          <Tokens
            amount={balance.tokens}
            decimals={token.decimals}
            symbol={token.symbol}
            isBalance
          />
        </div>
        <div className="text-body-secondary text-xs">
          <Fiat amount={balance.fiat("usd")} currency={"usd"} isBalance />
        </div>
      </div>
    </div>
  )
}

const getTokensSummary = (tokens: Token[]) => {
  const symbols = [...new Set(tokens.map((token) => token.symbol))]
  if (symbols.length < 3) return symbols.join(" & ")
  if (symbols.length === 3) return `${symbols[0]}, ${symbols[1]} & ${symbols[2]}`
  return `${symbols[0]}, ${symbols[1]} & ${symbols.length - 2} others`
}

const Account: FC<{ accountInfo: DcentAccountInfo }> = ({ accountInfo }) => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")
  const { data, error } = useDcentAddress(accountInfo.coinType, accountInfo.derivationPath)
  const { isOpen, toggle } = useOpenClose()

  const balanceParams = useMemo<BalanceByParamsProps>(() => {
    if (!data?.address) return {}
    return {
      addressesByTokens: {
        addresses: [data.address],
        tokenIds: accountInfo.tokens.map((t) => t.id),
      },
    }
  }, [accountInfo.tokens, data?.address])

  const balances = useBalancesByParams(balanceParams)

  const account = useAccountByAddress(data?.address)

  const [isImporting, setIsImporting] = useState(false)
  const handleImportClick = useCallback(async () => {
    if (!data?.address || isImporting || !!account) return

    setIsImporting(true)

    // TODO notification
    try {
      // ignore
      setAddress(
        await api.accountCreateDcent(
          `DCENT ${data.address}`,
          data.address,
          isEthereumAddress(data.address) ? "ethereum" : "ed25519",
          accountInfo.derivationPath,
          accountInfo.tokens.map((t) => t.id)
        )
      )
    } catch (err) {
      log.error(err)
    }
    setIsImporting(false)
  }, [account, accountInfo.derivationPath, accountInfo.tokens, data, isImporting, setAddress])

  if (error)
    return (
      <div className="bg-grey-800 text-alert-error my-4 p-4">
        {error.code} - {error.message}
      </div>
    )

  if (!data?.address)
    return (
      <div className="bg-grey-850  flex  h-[6rem] w-full animate-pulse items-center gap-6 rounded-sm px-8 text-left">
        <div className="bg-grey-750 h-16 w-16 rounded-full"></div>
        <div className="flex grow flex-col gap-3">
          <div className="bg-grey-750 rounded-xs h-8 w-[20rem]"></div>
          <div className="bg-grey-750 rounded-xs h-7 w-[12rem]"></div>
        </div>
      </div>
    )

  return (
    <div>
      <div className="relative">
        <button
          type="button"
          onClick={toggle}
          className="bg-grey-850 hover:bg-grey-800 hover:text-body text-body-secondary flex h-[6rem] w-full items-center gap-6 rounded-sm px-8 text-left"
        >
          <AccountIcon className="text-xl" address={data.address} />
          <div className="flex grow flex-col gap-2">
            <div>
              <span className="text-body font-bold">{accountInfo.name}</span>{" "}
              <span className="text-body-secondary">({shortenAddress(data.address)})</span>
            </div>
            <div className="flex items-center gap-[0.3em] leading-none">
              <div className="inline-block shrink-0">
                <div className="ml-[0.4em] text-base [&>div]:ml-[-0.4em]">
                  {accountInfo.tokens.slice(0, 3).map((token) => (
                    <div key={token.id} className="inline-block h-[1em] w-[1em]">
                      <TokenLogo tokenId={token.id} className="shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-body-secondary text-sm">
                {getTokensSummary(accountInfo.tokens)}
              </div>
            </div>
          </div>
          <div className="h-[3rem] w-[14rem] shrink-0"></div>
          <AccordionIcon isOpen={isOpen} />
        </button>

        <button
          type="button"
          onClick={handleImportClick}
          className="bg-primary-500 hover:bg-primary-700 absolute right-[4.4rem] top-[1.5rem] h-[3rem] min-w-[14rem] rounded text-black"
        >
          Connect
        </button>
      </div>
      <Accordion isOpen={isOpen}>
        <div className="pl-[6rem]">
          {accountInfo.tokens.map((token) => (
            <AccountToken key={token.id} address={data.address} token={token} balances={balances} />
          ))}
        </div>
      </Accordion>
    </div>
  )
}

const AccountsList = () => {
  const { tokensMap } = useTokens(true)
  const { data: accounts } = useDcentAccountInfo()

  // a dcent account entry is (1 token for 1 address)
  // group them by address to match talisman accounts
  const accountInfos = useMemo(() => {
    return accounts?.account.reduce((result, account) => {
      const tokenId = DCENT_COIN_NAME_TO_TOKEN_ID[account.coin_name]
      const token = tokensMap[tokenId]
      if (token) {
        const coinType = getDcentCoinTypeFromToken(token)
        if (coinType) {
          const existing = result.find(
            (r) => r.coinType === coinType && r.derivationPath === account.address_path
          )
          if (existing) existing.tokens.push(token)
          else
            result.push({
              name: `D'CENT ${isSubToken(token) ? "Polkadot" : "Ethereum"} ${
                result.filter((r) => r.coinType === coinType).length + 1
              }`,
              coinType,
              derivationPath: account.address_path,
              tokens: [token],
            })
        }
      } else log.warn("Unsupported account", account)

      return result
    }, [] as DcentAccountInfo[])
  }, [accounts?.account, tokensMap])

  if (!accountInfos) return null

  return (
    <div className="flex flex-col gap-4">
      {accountInfos.map((accountInfo) => (
        <Account
          key={`${accountInfo.coinType}-${accountInfo.derivationPath}`}
          accountInfo={accountInfo}
        />
      ))}
    </div>
  )
}

export const AccountAddDecentPage = () => {
  const { t } = useTranslation("admin")

  return (
    <DashboardLayout withBack centered>
      <HeaderBlock
        title={t("Connect D'CENT account")}
        text={t("Which account(s) would you like to connect ?")}
      />
      <Spacer small />
      <AccountsList />
    </DashboardLayout>
  )
}
