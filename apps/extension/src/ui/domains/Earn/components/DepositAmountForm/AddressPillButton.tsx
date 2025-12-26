// import { classNames } from "@talismn/util"
// import { getAccountGenesisHash } from "extension-core"
// import { FC, useMemo } from "react"
// import { PillButton } from "talisman-ui"

// import { WithTooltip } from "@talisman/components/Tooltip"
// import { AccountIcon } from "@ui/domains/Account/AccountIcon"
// import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
// import { Address } from "@ui/domains/Account/Address"
// import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
// import { useAccountByAddress } from "@ui/state"

// type AddressPillButtonProps = {
//   address?: string | null
//   className?: string
//   onClick?: () => void
// }

// export const AddressPillButton: FC<AddressPillButtonProps> = ({ address, className, onClick }) => {
//   const account = useAccountByAddress(address as string)

//   const { name, genesisHash: accountGenesisHash } = useMemo(() => {
//     if (account) return { name: account.name, genesisHash: getAccountGenesisHash(account) }
//     return { name: undefined, genesisHash: undefined }
//   }, [account])

//   const formattedAddress = useFormattedAddress(address ?? undefined, accountGenesisHash)
//   const displayAddress = useMemo(
//     () => (account ? formattedAddress : address) ?? undefined,
//     [account, address, formattedAddress],
//   )

//   if (!address) return null

//   return (
//     <PillButton className={classNames("h-16 max-w-full !px-4", className)} onClick={onClick}>
//       <div className="text-body flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base">
//         <AccountIcon className="!text-lg" address={address} genesisHash={accountGenesisHash} />
//         <div className="leading-base grow truncate">
//           {name ? (
//             <WithTooltip tooltip={displayAddress}>{name}</WithTooltip>
//           ) : (
//             <Address address={displayAddress} startCharCount={6} endCharCount={6} />
//           )}
//         </div>
//         <AccountTypeIcon type={account?.type} className="text-primary-500" />
//       </div>
//     </PillButton>
//   )
// }
