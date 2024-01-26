// import { Spacer } from "@talisman/components/Spacer"
// import { LedgerConnectionStatus } from "@ui/domains/Account/LedgerConnectionStatus"
// import { useLedgerSubstrateLegacy } from "@ui/hooks/ledger/useLedgerSubstrateLegacy"
// import { useLedgerSubstrateLegacyApp } from "@ui/hooks/ledger/useLedgerSubstrateLegacyApp"
// import useChain from "@ui/hooks/useChain"
// import useToken from "@ui/hooks/useToken"
// import { FC, useEffect } from "react"
// import { Trans, useTranslation } from "react-i18next"

// type ConnectLedgerSubstrateGenericProps = {
//   chainId?: undefined
//   onReadyChanged?: (ready: boolean) => void
//   className?: string
// }

// type ConnectLedgerSubstrateLegacyProps = {
//   chainId: string
//   onReadyChanged?: (ready: boolean) => void
//   className?: string
// }

// type ConnectLedgerSubstrateProps =
//   | ConnectLedgerSubstrateGenericProps
//   | ConnectLedgerSubstrateLegacyProps

// const ConnectLedgerSubstrateGeneric: FC<ConnectLedgerSubstrateGenericProps> = () => null

// const ConnectLedgerSubstrateLegacy: FC<ConnectLedgerSubstrateLegacyProps> = ({
//   chainId,
//   onReadyChanged,
//   className,
// }) => {
//   const chain = useChain(chainId)
//   const token = useToken(chain?.nativeToken?.id)
//   const ledger = useLedgerSubstrateLegacy(chain?.genesisHash, true)
//   const app = useLedgerSubstrateLegacyApp(chain?.genesisHash)
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
//         <Trans
//           t={t}
//           components={{
//             AppName: <span className="text-body">{appName}</span>,
//           }}
//           defaults="Connect and unlock your Ledger, then open the <AppName /> app on your Ledger."
//         />
//       </div>
//       <Spacer small />
//       <LedgerConnectionStatus {...ledger} />
//     </div>
//   )
// }

// export const ConnectLedgerSubstrate: FC<ConnectLedgerSubstrateProps> = ({ chainId, ...props }) => {
//   return chainId ? (
//     <ConnectLedgerSubstrateLegacy chainId={chainId} {...props} />
//   ) : (
//     <ConnectLedgerSubstrateGeneric {...props} />
//   )
// }
