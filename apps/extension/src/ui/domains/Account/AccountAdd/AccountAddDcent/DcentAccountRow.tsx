import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Token } from "@talismn/chaindata-provider"
import { CornerDownRightIcon } from "@talismn/icons"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { BalanceByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useDcentAddress } from "@ui/util/dcent"
import { FC, useMemo } from "react"
import { useOpenClose } from "talisman-ui"

import { DcentAccountConnectButton } from "./DcentAccountConnectButton"
import { DcentAccountTokenRow } from "./DcentAccountTokenRow"
import { DcentAccountInfo } from "./util"

const getTokensSummary = (tokens: Token[]) => {
  const symbols = [...new Set(tokens.map((token) => token.symbol))]
  if (symbols.length < 3) return symbols.join(" & ")
  if (symbols.length === 3) return `${symbols[0]}, ${symbols[1]} & ${symbols[2]}`
  return `${symbols[0]}, ${symbols[1]} & ${symbols.length - 2} others`
}

const useAccountBalances = (address: string | undefined, tokens: Token[]) => {
  const balanceParams = useMemo<BalanceByParamsProps>(() => {
    if (!address) return {}
    return {
      addressesAndTokens: {
        addresses: [address],
        tokenIds: tokens.map((t) => t.id),
      },
    }
  }, [tokens, address])

  return useBalancesByParams(balanceParams)
}

export const DcentAccountRow: FC<{ accountInfo: DcentAccountInfo }> = ({ accountInfo }) => {
  const { data: addressInfo, error } = useDcentAddress(
    accountInfo.coinType,
    accountInfo.derivationPath
  )
  const account = useAccountByAddress(addressInfo?.address)
  const tokens = useMemo(() => Object.values(accountInfo.tokens), [accountInfo.tokens])
  const balances = useAccountBalances(addressInfo?.address, tokens)
  const { isOpen, toggle } = useOpenClose()

  if (error)
    return (
      <div className="bg-grey-800 text-alert-error my-4 p-4">
        {error.code} - {error.message}
      </div>
    )

  if (!addressInfo?.address)
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
          <AccountIcon
            className="text-xl"
            address={addressInfo.address}
            genesisHash={account?.genesisHash}
          />
          <div className="flex grow flex-col gap-2 overflow-hidden">
            <div className="flex w-full gap-[0.5em] overflow-hidden">
              <span className="text-body truncate font-bold">
                {account?.name ?? accountInfo.name}
              </span>{" "}
              <span className="text-body-secondary shrink-0">
                ({shortenAddress(addressInfo.address)})
              </span>
            </div>
            <div className="flex items-center gap-[0.3em] leading-none">
              <div className="inline-block shrink-0">
                <div className="ml-[0.4em] text-base [&>div]:ml-[-0.4em]">
                  {tokens.slice(0, 3).map((token) => (
                    <div key={token.id} className="inline-block h-[1em] w-[1em]">
                      <TokenLogo tokenId={token.id} className="shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-body-secondary text-sm">{getTokensSummary(tokens)}</div>
            </div>
          </div>
          <div className="h-[3rem] w-[14rem] shrink-0"></div>
          <AccordionIcon isOpen={isOpen} />
        </button>
        <DcentAccountConnectButton
          className="absolute right-[4.4rem] top-[1.5rem] "
          accountInfo={accountInfo}
          address={addressInfo.address}
        />
      </div>
      <Accordion isOpen={isOpen}>
        <div className="relative pl-[6rem]">
          {Object.entries(accountInfo.tokens).map(([label, token]) => (
            <DcentAccountTokenRow
              key={token.id}
              address={addressInfo.address}
              label={label}
              token={token}
              balances={balances.balances}
            />
          ))}
          <CornerDownRightIcon className="text-body-disabled absolute left-12 top-6 text-lg" />
        </div>
      </Accordion>
    </div>
  )
}
