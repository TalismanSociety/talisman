import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types"
import { classNames } from "@talismn/util"
import { useCallback } from "react"
import { Button } from "talisman-ui"

import { Section } from "../../shared/Section"
import { useWallet } from "./useWallet"

export const SubstrateAccounts = () => (
  <Section title="Accounts">
    <AccountInner />
  </Section>
)

const AccountInner = () => {
  const { isConnected, accounts, connect, disconnect, select, account } = useWallet()

  const handleSelect = useCallback(
    (acc: InjectedAccountWithMeta) => () => {
      select(acc)
    },
    [select]
  )

  return isConnected ? (
    <div className="space-y-8">
      <div className="my-8 flex flex-wrap gap-8">
        {accounts?.map((acc) => {
          return (
            <Button
              key={`${acc.meta.source}-${acc.address}`}
              className={classNames(acc === account && "!text-primary-500")}
              onClick={handleSelect(acc)}
            >
              <div>{acc.meta.name ?? acc.address}</div>
              <div>{acc.meta.source}</div>
            </Button>
          )
        }) ?? null}
      </div>
      <div>
        Selected account address : <span className="font-mono">{account?.address ?? "N/A"}</span>
      </div>
      <Button small primary onClick={disconnect}>
        Disconnect Wallet
      </Button>
    </div>
  ) : (
    <Button small primary onClick={connect}>
      Connect Wallet
    </Button>
  )
}
