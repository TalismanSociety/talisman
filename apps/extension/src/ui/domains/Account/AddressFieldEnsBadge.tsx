import { CheckCircleIcon, LoaderIcon } from "@talisman/theme/icons"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"

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
      <div className="bg-grey-750 flex items-center gap-4 rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <AccountIcon className="text-lg" address={ensLookup} />
          <Address className="text-body bg-grey-750" address={ensLookup} />
        </div>
        {isEnsFetching ? (
          <LoaderIcon className="text-body-disabled animate-spin-slow" />
        ) : (
          <CheckCircleIcon className="text-primary" />
        )}
      </div>
    )}
  </>
)
