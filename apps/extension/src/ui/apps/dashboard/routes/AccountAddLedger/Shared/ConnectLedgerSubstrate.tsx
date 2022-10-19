import Spacer from "@talisman/components/Spacer"
import { LedgerConnectionStatus } from "@ui/domains/Account/LedgerConnectionStatus"
import useChain from "@ui/hooks/useChain"
import { useLedgerSubstrate } from "@ui/hooks/ledger/useLedgerSubstrate"
import useToken from "@ui/hooks/useToken"
import { useEffect } from "react"
import { useLedgerSubstrateApp } from "@ui/hooks/ledger/useLedgerSubstrateApp"

export const ConnectLedgerSubstrate = ({
  chainId,
  onReadyChanged,
  className,
}: {
  chainId: string
  onReadyChanged?: (ready: boolean) => void
  className?: string
}) => {
  const chain = useChain(chainId)
  const token = useToken(chain?.nativeToken?.id)
  const ledger = useLedgerSubstrate(chain?.genesisHash)
  const app = useLedgerSubstrateApp(chain?.genesisHash)

  useEffect(() => {
    onReadyChanged?.(ledger.isReady)

    return () => {
      onReadyChanged?.(false)
    }
  }, [ledger.isReady, onReadyChanged])

  if (!app) return null

  return (
    <div className={className}>
      <div className="text-body-secondary m-0">
        Connect and unlock your Ledger, then open the{" "}
        <span className="text-body">
          {app.label} {token?.symbol ? `(${token.symbol})` : null}
        </span>{" "}
        app on your Ledger.
      </div>
      <Spacer small />
      <LedgerConnectionStatus {...ledger} />
    </div>
  )
}
