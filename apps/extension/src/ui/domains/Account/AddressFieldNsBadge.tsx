import { WithTooltip } from "@talisman/components/Tooltip"
import { CheckCircleIcon, LoaderIcon } from "@talismn/icons"
import type { NsLookupType } from "@talismn/on-chain-id"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { PillButton } from "@ui/talisman-ui"

export const AddressFieldNsBadge = ({
  nsLookup,
  // nsLookupType,
  isNsLookup,
  isNsFetching,
  small,
}: {
  nsLookup: string | null | undefined
  nsLookupType: NsLookupType | null
  isNsLookup: boolean
  isNsFetching: boolean
  small?: boolean
}) => (
  <>
    {isNsLookup && !nsLookup && isNsFetching ? (
      <LoaderIcon className="animate-spin-slow text-body-disabled" />
    ) : null}

    {isNsLookup && nsLookup && (
      <WithTooltip
        tooltip={nsLookup}
        // if we're not in a popup, no need to wrap
        noWrap={!document.getElementById("main")}
      >
        {small ? (
          // biome-ignore lint/complexity/noUselessFragments: legacy
          <>
            {isNsFetching ? (
              <LoaderIcon className="animate-spin-slow text-body-disabled" />
            ) : (
              <CheckCircleIcon className="text-primary" />
            )}
          </>
        ) : (
          <PillButton className="!cursor-default !px-4 h-16 max-w-full">
            <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
              <AccountIcon className="text-lg" address={nsLookup} />
              <div className="grow truncate leading-base">
                <Address className="text-body" address={nsLookup} noTooltip />
              </div>
              {isNsFetching ? (
                <LoaderIcon className="animate-spin-slow text-body-disabled" />
              ) : (
                <CheckCircleIcon className="text-primary" />
              )}
            </div>
          </PillButton>
        )}
      </WithTooltip>
    )}
  </>
)
