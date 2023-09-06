import { WithTooltip } from "@talisman/components/Tooltip"
import { CheckCircleIcon, LoaderIcon } from "@talismn/icons"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { PillButton } from "talisman-ui"

export const AddressFieldEnsBadge = ({
  ensLookup,
  isEnsLookup,
  isEnsFetching,
}: {
  ensLookup: string | null | undefined
  isEnsLookup: boolean
  isEnsFetching: boolean
}) => (
  <>
    {isEnsLookup && !ensLookup && isEnsFetching ? (
      <LoaderIcon className="text-body-disabled animate-spin-slow" />
    ) : null}

    {isEnsLookup && ensLookup && (
      <WithTooltip
        tooltip={ensLookup}
        // if we're not in a popup, no need to wrap
        noWrap={!document.getElementById("main")}
      >
        <PillButton className="h-16 max-w-full !cursor-default !px-4">
          <div className="text-body flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base">
            <AccountIcon className="text-lg" address={ensLookup} />
            <div className="leading-base grow truncate">
              <Address className="text-body" address={ensLookup} noTooltip />
            </div>
            {isEnsFetching ? (
              <LoaderIcon className="text-body-disabled animate-spin-slow" />
            ) : (
              <CheckCircleIcon className="text-primary" />
            )}
          </div>
        </PillButton>
      </WithTooltip>
    )}
  </>
)
