import { classNames } from "@talismn/util"
import { DefiPosition, DefiPositionItem } from "extension-core"
import { log } from "extension-shared"
import { FC, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { formatUnits } from "viem"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { useDefiPositions } from "@ui/state"

export const PopupDefiPosition: FC<{ positionId: string | undefined }> = ({ positionId }) => {
  const positions = useDefiPositions()
  const position = useMemo(
    () => positions.data?.find((p) => p.id === positionId),
    [positions.data, positionId],
  )

  // TODO remove
  useEffect(() => {
    log.debug("[DeFi] position", position)
  }, [position])

  // TODO message if empty

  if (!position) return null

  return <DefiPositionContainer position={position} />

  // TODO not good, wont see shimmer while loading
  // return <FadeIn>{!positions?.data?.length ? <NoDefiPositionFound /> : <DefiPositions />}</FadeIn>
}

const DefiPositionContainer: FC<{ position: DefiPosition }> = ({ position }) => {
  // const positions = useDefiPositionsDisplay()

  return (
    <div className="">
      <div
        className={classNames(
          "bg-grey-800 flex h-28 w-full items-center gap-4 overflow-hidden border-transparent px-6",
          position.breakdown.length ? "rounded-t-sm" : "rounded",
        )}
      >
        <div className="text-xl">
          <AssetLogo url={position.defiLogoUrl} />
        </div>
        <div className="flex grow flex-col justify-center gap-2 overflow-hidden pr-8">
          <div className="flex grow items-center gap-3">
            <div className="text-body truncate text-sm font-bold">{position.name}</div>
          </div>
          <div className="flex w-full items-center gap-2 overflow-hidden text-xs">
            <NetworkLogo networkId={position.networkId} />
            <span className="text-body-secondary truncate">
              <NetworkName networkId={position.networkId} />
            </span>
          </div>
        </div>
        {/* {tokenId && (
          <div className="size-[3.8rem] shrink-0 empty:hidden">
            <Suspense fallback={<SuspenseTracker name="StakeButton" />}>
              <BondButton tokenId={tokenId} balances={balances} />
            </Suspense>
          </div>
        )}
        {tokenId && (
          <div className="size-[3.8rem] shrink-0">
            <TokenContextMenu
              tokenId={tokenId}
              className="hover:bg-grey-700 focus-visible:bg-grey-700 rounded-full"
            />
          </div>
        )} */}
        <div className="size-[3.8rem] shrink-0">
          <PositionContextMenu position={position} />
        </div>
      </div>

      {position.breakdown.map((item: DefiPositionItem, idx, arr) => (
        <DefiPositionItemRow key={idx} item={item} roundedBottom={idx === arr.length - 1} />
      ))}
    </div>
  )
}

const DefiPositionItemRow: FC<{ item: DefiPositionItem; roundedBottom: boolean }> = ({
  item,
  roundedBottom,
}) => {
  // const { t } = useTranslation()

  return (
    <div
      className={classNames(
        "bg-grey-850 flex h-28 w-full items-center gap-4 overflow-hidden px-6",
        roundedBottom && "rounded-b-sm",
      )}
    >
      <div className="text-xl">
        <AssetLogo url={item.logo} />
      </div>
      <div className="flex w-full grow flex-col gap-2 overflow-hidden">
        <div className="text-body flex w-full items-center justify-between gap-6 overflow-hidden text-sm font-bold">
          <div>{item.name}</div>
          <div>
            <PositionItemTokens item={item} />
          </div>
        </div>
        <div className="text-body-secondary flex w-full items-center justify-between gap-6 overflow-hidden text-xs font-normal">
          <div>
            <PositionItemTypeDisplay type={item.type} />
          </div>
          <div>
            <FiatFromUsd amount={item.valueUsd} isBalance />
          </div>
        </div>
      </div>
    </div>
  )
}

const PositionItemTokens: FC<{ item: DefiPositionItem }> = ({ item }) => {
  const tokens = useMemo(() => {
    try {
      return formatUnits(BigInt(item.amount), item.decimals)
    } catch (err) {
      log.error("[DefiPositionItemTokens] Error formatting units", { item, err })
      return null
    }
  }, [item])

  return <Tokens amount={tokens} decimals={item.decimals} symbol={item.symbol} isBalance />
}

const PositionItemTypeDisplay: FC<{ type: DefiPositionItem["type"] }> = ({ type }) => {
  const { t } = useTranslation()

  return useMemo(() => {
    switch (type) {
      case "airdrop":
        return t("Airdrop")
      case "deposit":
        return t("Deposit")
      case "loan":
        return t("Loan")
      case "locked":
        return t("Locked")
      case "reward":
        return t("Reward")
      case "margin":
        return t("Margin")
      case "staked":
        return t("Staked")
      default:
        return t("Unknown")
    }
  }, [t, type])
}

// const VirtualizedRows: FC<{ positions: Loadable<DefiPosition[]> }> = ({ positions }) => {
//   const { ref: refContainer } = useScrollContainer()
//   const ref = useRef<HTMLDivElement>(null)

//   const [noCountUp, setNoCountUp] = useState(false)
//   useEffect(() => {
//     const timeout = setTimeout(() => {
//       // we only want count up on the first rendering of the table
//       // ex: sorting or filtering rows using search box should not trigger count up
//       setNoCountUp(true)
//     }, 500)

//     return () => clearTimeout(timeout)
//   }, [])

//   const rows = useMemo(
//     () =>
//       (positions.data ?? []).concat(
//         ...(positions.status === "loading" ? [{ id: "SHIMMER" } as DefiPosition] : []),
//       ),
//     [positions],
//   )

//   const virtualizer = useVirtualizer({
//     count: rows.length,
//     overscan: 5,
//     gap: 8,
//     estimateSize: () => 56,
//     getScrollElement: () => refContainer.current,
//   })

//   return (
//     <div ref={ref}>
//       <div
//         className="relative w-full"
//         style={{
//           height: `${virtualizer.getTotalSize()}px`,
//         }}
//       >
//         {virtualizer.getVirtualItems().map((item) => (
//           <div
//             key={item.key}
//             className="absolute left-0 top-0 h-28 w-full"
//             style={{
//               transform: `translateY(${item.start}px)`,
//             }}
//           >
//             {!!rows[item.index] && (
//               <DefiPositionRow
//                 key={rows[item.index].id}
//                 position={rows[item.index]}
//                 status={positions.status}
//                 noCountUp={noCountUp}
//               />
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   )
// }

// const TotalRow: FC<{ positions: DefiPosition[] }> = ({ positions }) => {
//   const { t } = useTranslation()

//   const totalValue = useMemo(
//     () =>
//       positions.reduce(
//         (total, position) =>
//           total + position.breakdown.reduce((sum, item) => sum + item.valueUsd, 0),
//         0,
//       ),
//     [positions],
//   )

//   return (
//     <div className="text-body-secondary flex w-full items-center justify-between text-sm">
//       <div>{t("Total")}</div>
//       <div>
//         <FiatFromUsd amount={totalValue} isBalance />
//       </div>
//     </div>
//   )
// }

// const DefiPositionRow: FC<{
//   position: DefiPosition
//   status: LoadableStatus
//   noCountUp: boolean
// }> = ({ position, status, noCountUp }) => {
//   const selectedAccounts = usePortfolioSelectedAccounts()
//   const navigate = useNavigate()

//   if (position.id === "SHIMMER")
//     return (
//       <div className="bg-grey-850 flex h-28 w-full items-center gap-4 rounded-sm px-6">
//         <div className="bg-body-disabled size-16 shrink-0 animate-pulse rounded-full"></div>
//         <div className="flex grow flex-col gap-2">
//           <div className="flex w-full animate-pulse items-center justify-between text-sm font-bold">
//             <div className="text-body-disabled bg-body-disabled rounded-xs">Protocol</div>
//             <div className="text-body-disabled bg-body-disabled rounded-xs">TKN/TKN</div>
//           </div>
//           <div className="flex w-full animate-pulse items-center justify-between text-xs font-normal">
//             <div className="text-body-disabled bg-body-disabled rounded-xs">Account name</div>
//             <div className="text-body-disabled bg-body-disabled rounded-xs">Amount USD</div>
//           </div>
//         </div>
//       </div>
//     )

//   return (
//     <button
//       type="button"
//       className={classNames(
//         "bg-grey-850 hover:bg-grey-800 flex h-28 w-full items-center gap-4 overflow-hidden rounded-sm px-6",
//       )}
//       onClick={() => navigate(`/portfolio/defi/${position.id}`)}
//     >
//       {/* AssetLogo can be used with any image and fallbacks to an unknown "Talisman hand" logo */}
//       <AssetLogo url={position.defiLogoUrl} className="size-16" />
//       <div className="flex w-full grow flex-col gap-2 overflow-hidden">
//         <div className="flex w-full items-center justify-between gap-6 overflow-hidden text-sm font-bold">
//           <div className="flex max-w-full items-center gap-2 overflow-hidden">
//             <div className="truncate">{position.defiName}</div>
//             <NetworkLogo networkId={position.networkId} className="inline-block" />
//           </div>
//           <div className="max-w-[50%] shrink-0 truncate">
//             <PositionSymbol position={position} />
//           </div>
//         </div>
//         <div className="text-body-secondary flex w-full items-center justify-between text-xs font-normal">
//           <div className="truncate">
//             {selectedAccounts?.length === 1 ? (
//               // if one and only one account is selected, show the position type
//               <PositionType type={position.type} />
//             ) : (
//               // otherwise we must display which account is holding the position
//               <PositionAccount position={position} />
//             )}
//           </div>
//           <div className={classNames(status === "loading" && "animate-pulse")}>
//             <PositionTotal position={position} noCountUp={noCountUp} />
//           </div>
//         </div>
//       </div>
//     </button>
//   )
// }

// const NoDefiPositionFound = () => {
//   const { t } = useTranslation()
//   const { selectedAccount, selectedFolder } = usePortfolioNavigation()
//   const { status } = useDefiPositionsDisplay()

//   const msg = useMemo(() => {
//     if (status === "loading")
//       return <span className="animate-pulse">{t("Loading DeFi positions...")}</span>
//     return selectedAccount
//       ? t("No DeFi position found for this account")
//       : selectedFolder
//         ? t("No DeFi position found for this folder")
//         : t("No DeFi position found")
//   }, [selectedAccount, selectedFolder, status, t])

//   return <div className="text-body-secondary bg-field rounded px-8 py-36 text-center">{msg}</div>
// }

// const PositionType: FC<{ type: DefiPositionType }> = ({ type }) => {
//   const { t } = useTranslation()

//   return useMemo(() => {
//     switch (type) {
//       case "deposit":
//         return t("Deposit")
//       case "loan":
//         return t("Loan")
//       case "reward":
//         return t("Reward")
//       case "lp":
//         return t("Liquidity Provider")
//       case "staking":
//         return t("Staking")
//       case "stream":
//         return t("Streaming")
//       case "unknown":
//       default:
//         return t("Unknown")
//     }
//   }, [type, t])
// }

// const PositionTotal: FC<{ position: DefiPosition; noCountUp: boolean }> = ({
//   position,
//   noCountUp,
// }) => {
//   const totalValue = useMemo(
//     () => position.breakdown.reduce((acc, item) => acc + item.valueUsd, 0),
//     [position.breakdown],
//   )

//   return <FiatFromUsd amount={totalValue} isBalance noCountUp={noCountUp} />
// }

// const PositionSymbol: FC<{ position: DefiPosition }> = ({ position }) => {
//   return useMemo(() => {
//     return uniq(position.breakdown.map((item) => item.symbol.trim())).join("/")
//   }, [position.breakdown])
// }

// const PositionAccount: FC<{ position: DefiPosition }> = ({ position }) => {
//   const account = useAccountByAddress(position.address)

//   if (!account) return null

//   return (
//     <div className="flex max-w-full items-center gap-2 overflow-hidden">
//       <AccountIcon address={account.address} />
//       <div className="truncate">{account.name}</div>
//     </div>
//   )
// }

const PositionContextMenu: FC<{ position: DefiPosition }> = () => {
  return null
}
