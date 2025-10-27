import { parseTokenId, TokenId } from "@talismn/chaindata-provider"
import { ZapOffIcon } from "@talismn/icons"
import { Address, isAccountOwned } from "extension-core"
import { FC, useCallback, useMemo } from "react"
import { PillButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useBittensorBondModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondModal"
import { BittensorStakingWizardOpenOptions } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondWizard"
import { useAccountByAddress } from "@ui/state"

import { PortfolioAccount } from "../PortfolioAccount"

type AssetStateProps = {
  title: string
  description?: string
  render: boolean
  address?: Address
  isLoading?: boolean
  locked?: boolean
  tokenId: TokenId
}

export const AssetState = ({
  title,
  description,
  render,
  address,
  isLoading,
  locked,
  tokenId,
}: AssetStateProps) => {
  if (!render) return null
  return (
    <div className="flex flex-col justify-center gap-2 overflow-hidden p-8">
      <div className="flex w-full items-baseline gap-4 overflow-hidden">
        <div className="shrink-0 whitespace-nowrap font-bold capitalize text-white">
          {title} <BittensorUnbondButton address={address} tokenId={tokenId} />
        </div>
        {/* show description next to title when address is set */}
        {description && address && (
          <Tooltip>
            <TooltipTrigger className="max-w-full truncate text-sm">{description}</TooltipTrigger>
            <TooltipContent>{description}</TooltipContent>
          </Tooltip>
        )}
        {!description && address && isLoading && (
          <div className="bg-grey-800 rounded-xs h-[1.4rem] w-60 animate-pulse" />
        )}
      </div>
      {address && (
        <div className="text-sm">
          <PortfolioAccount address={address} />
        </div>
      )}
      {/* show description below title when address is not set */}
      {isLoading && !description && !address && locked && (
        <div className="bg-grey-800 rounded-xs h-[1.6rem] w-60 animate-pulse" />
      )}
      {description && !address && (
        <Tooltip>
          <TooltipTrigger className="max-w-full truncate text-left text-sm">
            {description}
          </TooltipTrigger>
          <TooltipContent>{description}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

const BittensorUnbondButton: FC<{
  address: string | null | undefined
  tokenId: TokenId | null | undefined
}> = ({ address, tokenId }) => {
  const account = useAccountByAddress(address)

  const { open: openUnbondModal } = useBittensorBondModal()

  const opts = useMemo(() => {
    if (!tokenId || !account || !isAccountOwned(account)) return null
    const parsed = parseTokenId(tokenId)
    if (parsed.type !== "substrate-dtao") return null

    const opts: BittensorStakingWizardOpenOptions = {
      stakeDirection: "unbond",
      networkId: parsed.networkId,
      hotkey: parsed.hotkey,
      netuid: parsed.netuid,
      address: account.address,
    }
    return opts
  }, [account, tokenId])

  const handleClick = useCallback(() => {
    if (!opts) return
    openUnbondModal(opts)
  }, [openUnbondModal, opts])

  if (!opts) return null

  return (
    <PillButton className="rounded-full p-3 text-xs" onClick={handleClick}>
      <ZapOffIcon className="text-xs" />
    </PillButton>
  )
}
