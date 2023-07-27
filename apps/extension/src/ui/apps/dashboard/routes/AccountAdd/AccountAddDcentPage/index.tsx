import { log } from "@core/log"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { Token } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/util"
import { api } from "@ui/api"
import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import useTokens from "@ui/hooks/useTokens"
import { useDcentAccountInfo, useDcentAddress } from "@ui/util/dcent"
import DcentWebConnector from "dcent-web-connector"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

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
  coinType: string
  derivationPath: string
  tokens: Token[]
}

const AccountToken: FC<{ address: string; token: Token }> = ({ token }) => {
  return <div>{token.symbol}</div>
}

const Account: FC<{ accountInfo: DcentAccountInfo }> = ({ accountInfo }) => {
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")
  const { data, error } = useDcentAddress(accountInfo.coinType, accountInfo.derivationPath)

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

  if (!data) return <div className="bg-grey-800 my-4 p-4">Loading...</div>

  return (
    <div className="bg-grey-800 my-4 flex w-full p-4">
      <div className="grow">
        <div className="font-mono">{data.address}</div>
        {accountInfo.tokens.map((token) => (
          <AccountToken key={token.id} address={data.address} token={token} />
        ))}
      </div>
      <button
        onClick={handleImportClick}
        className="bg-grey-700 enabled:hover:bg-grey-600 disabled:opacity-50"
      >
        Connect
      </button>
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
          else result.push({ coinType, derivationPath: account.address_path, tokens: [token] })

          // if(!acc) {

          // }
        }
      } else log.warn("Unsupported account", account)

      return result
    }, [] as DcentAccountInfo[])
  }, [accounts?.account, tokensMap])

  if (!accountInfos) return null

  return (
    <div>
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

  // TODO check connectivity
  // const { data: info, error: infoError } = useDcentInfo()
  // const { data: deviceInfo, error: deviceInfoError } = useDcentDeviceInfo({ enabled: !!info })

  return (
    <DashboardLayout withBack centered>
      <HeaderBlock
        title={t("Attach D'CENT account")}
        text={t("What type of account would you like to create ?")}
      />
      <Spacer small />
      <AccountsList />
    </DashboardLayout>
  )
}
