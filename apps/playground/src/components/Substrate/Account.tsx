import { useCallback } from "react"
import { Button, classNames } from "talisman-ui"
import { useWallet } from "./useWallet"
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types"
import { Section } from "../Section"
export const Account = () => {
  const { isConnected, accounts, connect, disconnect, select, account } = useWallet()

  const handleSelect = useCallback(
    (acc: InjectedAccountWithMeta) => () => {
      select(acc)
    },
    [select]
  )

  return (
    <Section title="Account">
      {isConnected ? (
        <div className="space-y-8">
          <div className="flex-wap my-8 flex gap-8">
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
            Selected account address :{" "}
            <span className="font-mono">{account?.address ?? "N/A"}</span>
          </div>
          <Button primary onClick={disconnect}>
            Disconnect Wallet
          </Button>
        </div>
      ) : (
        <Button primary onClick={connect}>
          Connect Wallet
        </Button>
      )}
    </Section>
  )
}
