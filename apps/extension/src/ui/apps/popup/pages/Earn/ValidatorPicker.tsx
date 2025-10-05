import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { YieldValidator } from "extension-core"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { SearchInput } from "@talisman/components/SearchInput"
import { ValidatorItem } from "@ui/domains/Earn/components/ValidatorItem"
// import { useDepositWizard } from "@ui/domains/Earn/context/DepositWizardContext" // Not available in popup pages
import { useYieldValidators } from "@ui/domains/Earn/hooks/useYieldValidators"

type SortMethod = "name" | "tvl" | "rewardRate" | "nominatorCount"

export const ValidatorPickerPage = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // const { set: setDepositWizard } = useDepositWizard() // Not available in popup pages

  const tokenId = searchParams.get("tokenId")
  const productId = searchParams.get("productId")
  const [search, setSearch] = useState("")
  const [sortMethod, setSortMethod] = useState<SortMethod>("tvl")

  // Use the custom hook to fetch validators
  const { validators, isLoading, error } = useYieldValidators(productId || "")

  // Sort and filter validators
  const filteredValidators = useMemo(() => {
    const filtered = validators.filter((validator) =>
      validator.name.toLowerCase().includes(search.toLowerCase()),
    )

    // Sort validators
    filtered.sort((a, b) => {
      switch (sortMethod) {
        case "name":
          return a.name.localeCompare(b.name)
        case "tvl":
          return parseFloat(b.tvl || "0") - parseFloat(a.tvl || "0")
        case "rewardRate":
          return (b.rewardRate?.total || 0) - (a.rewardRate?.total || 0)
        case "nominatorCount":
          return (b.nominatorCount || 0) - (a.nominatorCount || 0)
        default:
          return 0
      }
    })

    return filtered
  }, [validators, search, sortMethod])

  const handleValidatorSelect = useCallback(
    (validator: YieldValidator) => {
      // Check if we have a selected account from URL params
      const urlParams = new URLSearchParams(window.location.search)
      const account = urlParams.get("account")

      if (!account) {
        // No account selected, navigate to account picker
        const accountPickerUrl = `/select-product/select-account?tokenId=${encodeURIComponent(tokenId || "")}&productId=${encodeURIComponent(productId || "")}&validatorAddress=${encodeURIComponent(validator.address)}`
        navigate(accountPickerUrl)
      } else {
        // Account is selected, go directly to deposit page
        const params = new URLSearchParams({
          account,
          tokenId: tokenId || "",
          productId: productId || "",
          validatorAddress: validator.address,
        })
        navigate(`/select-product/deposit/amount?${params.toString()}`)
      }
    },
    [navigate, tokenId, productId],
  )

  const handleDismiss = () => {
    // Go back to earn page
    navigate(`/select-product?tokenId=${encodeURIComponent(tokenId || "")}`, { replace: true })
  }

  if (!productId) {
    return <div>Invalid product ID</div>
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-black">
      <header className="flex w-full items-center justify-between gap-8 overflow-hidden p-10">
        <IconButton onClick={handleDismiss}>
          <ChevronLeftIcon />
        </IconButton>
        <div className="text-base font-bold">{t("Select Validator")}</div>
        <IconButton onClick={handleDismiss} className="invisible">
          <XIcon />
        </IconButton>
      </header>

      <div className="grow overflow-hidden p-12 pt-0">
        {/* Search Input */}
        <div className="flex min-h-fit w-full items-center gap-8 pb-8">
          <SearchInput onChange={setSearch} placeholder={t("Search for validator name")} />
        </div>

        {/* Sort Pills */}
        <div className="flex w-full gap-4 overflow-x-auto pb-8">
          <button
            type="button"
            onClick={() => setSortMethod("tvl")}
            className={classNames(
              "shrink-0 rounded-full px-8 py-4 text-xs font-medium transition-colors",
              sortMethod === "tvl"
                ? "bg-white text-black"
                : "bg-grey-800 text-grey-400 hover:bg-grey-700",
            )}
          >
            TVL
          </button>
          <button
            type="button"
            onClick={() => setSortMethod("rewardRate")}
            className={classNames(
              "shrink-0 rounded-full px-8 py-4 text-xs font-medium transition-colors",
              sortMethod === "rewardRate"
                ? "bg-white text-black"
                : "bg-grey-800 text-grey-400 hover:bg-grey-700",
            )}
          >
            APR
          </button>
          <button
            type="button"
            onClick={() => setSortMethod("nominatorCount")}
            className={classNames(
              "shrink-0 rounded-full px-8 py-4 text-xs font-medium transition-colors",
              sortMethod === "nominatorCount"
                ? "bg-white text-black"
                : "bg-grey-800 text-grey-400 hover:bg-grey-700",
            )}
          >
            Stakers
          </button>
          <button
            type="button"
            onClick={() => setSortMethod("name")}
            className={classNames(
              "shrink-0 rounded-full px-8 py-4 text-xs font-medium transition-colors",
              sortMethod === "name"
                ? "bg-white text-black"
                : "bg-grey-800 text-grey-400 hover:bg-grey-700",
            )}
          >
            Name
          </button>
        </div>

        {/* Validators List */}
        <div className="flex h-full flex-col gap-8 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-grey-400">{t("Loading validators...")}</div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-red-400">{error?.message || "Failed to load validators"}</div>
            </div>
          ) : filteredValidators.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-grey-400">{t("No validators found")}</div>
            </div>
          ) : (
            filteredValidators.map((validator) => (
              <ValidatorItem
                key={validator.address}
                validator={validator}
                isSelected={false}
                onClick={() => handleValidatorSelect(validator)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
