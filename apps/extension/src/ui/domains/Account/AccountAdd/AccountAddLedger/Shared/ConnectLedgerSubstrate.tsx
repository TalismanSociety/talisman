// import { Spacer } from "@talisman/components/Spacer"
// import { LedgerConnectionStatus } from "@ui/domains/Account/LedgerConnectionStatus"
// import { useLedgerSubstrate } from "@ui/hooks/ledger/useLedgerSubstrate"
// import { useLedgerSubstrateApp } from "@ui/hooks/ledger/useLedgerSubstrateApp"
// import useChain from "@ui/hooks/useChain"
// import useToken from "@ui/hooks/useToken"
// import { useEffect } from "react"
// import { Trans, useTranslation } from "react-i18next"

// export const ConnectLedgerSubstrate = ({
//   chainId,
//   onReadyChanged,
//   className,
// }: {
//   chainId: string
//   onReadyChanged?: (ready: boolean) => void
//   className?: string
// }) => {
//   const chain = useChain(chainId)
//   const token = useToken(chain?.nativeToken?.id)
//   const ledger = useLedgerSubstrate(chain?.genesisHash, true)
//   const app = useLedgerSubstrateApp(chain?.genesisHash)
//   const { t } = useTranslation("admin")

//   useEffect(() => {
//     onReadyChanged?.(ledger.isReady)

//     return () => {
//       onReadyChanged?.(false)
//     }
//   }, [ledger.isReady, onReadyChanged])

//   if (!app) return null

//   const appName = app.label + (token?.symbol ? ` (${token.symbol})` : "")

//   return (
//     <div className={className}>
//       <div className="text-body-secondary m-0">
//         <Trans t={t}>
//           Connect and unlock your Ledger, then open the <span className="text-body">{appName}</span>{" "}
//           app on your Ledger.
//         </Trans>
//       </div>
//       <Spacer small />
//       <LedgerConnectionStatus {...ledger} />
//     </div>
//   )
// }
