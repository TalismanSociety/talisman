import { WithTooltip } from "@talisman/components/Tooltip"
import { CheckCircleIcon, LoaderIcon } from "@talismn/icons"
import { NsLookupType } from "@talismn/on-chain-id"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { PillButton } from "talisman-ui"

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
      <LoaderIcon className="text-body-disabled animate-spin-slow" />
    ) : null}

    {isNsLookup && nsLookup && (
      <WithTooltip
        tooltip={nsLookup}
        // if we're not in a popup, no need to wrap
        noWrap={!document.getElementById("main")}
      >
        {small ? (
          <>
            {isNsFetching ? (
              <LoaderIcon className="text-body-disabled animate-spin-slow" />
            ) : (
              <CheckCircleIcon className="text-primary" />
            )}
          </>
        ) : (
          <PillButton className="h-16 max-w-full !cursor-default !px-4">
            <div className="text-body flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base">
              <AccountIcon className="text-lg" address={nsLookup} />
              <div className="leading-base grow truncate">
                <Address className="text-body" address={nsLookup} noTooltip />
              </div>
              {isNsFetching ? (
                <LoaderIcon className="text-body-disabled animate-spin-slow" />
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
