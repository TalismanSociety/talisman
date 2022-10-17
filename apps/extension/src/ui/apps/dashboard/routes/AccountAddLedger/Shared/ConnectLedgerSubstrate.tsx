import Spacer from "@talisman/components/Spacer"
import { LedgerConnectionStatus } from "@ui/domains/Account/LedgerConnectionStatus"
import useChain from "@ui/hooks/useChain"
import { useLedgerSubstrate } from "@ui/hooks/useLedgerSubstrate"
import useToken from "@ui/hooks/useToken"
import { useEffect } from "react"

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

  useEffect(() => {
    onReadyChanged?.(ledger.isReady)

    return () => {
      onReadyChanged?.(false)
    }
  }, [ledger.isReady, onReadyChanged])

  return (
    <div className={className}>
      <div className="text-body-secondary m-0">
        Connect and unlock your Ledger, then open the{" "}
        <span className="text-body">
          {chain?.chainName} {token?.symbol ? `(${token.symbol})` : null}
        </span>{" "}
        app on your Ledger.
      </div>
      <Spacer small />
      <LedgerConnectionStatus {...ledger} />
    </div>
  )
}
