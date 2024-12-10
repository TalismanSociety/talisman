import { SettingsIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"

import { useBondWizard } from "../Bond/useBondWizard"
import { useGetBittensorValidator } from "../hooks/bittensor/useGetBittensorValidator"

type BittensorDelegatorNameButtonProps = {
  poolId: string | number | undefined | null
}

export const BittensorDelegatorNameButton = ({ poolId }: BittensorDelegatorNameButtonProps) => {
  const { data, isLoading, isError } = useGetBittensorValidator(poolId)

  const { setStep, step } = useBondWizard()

  const defaultPoolName = "Bittensor Pool"

  const poolName = data?.data?.[0].name

  if (isLoading)
    return (
      <div
        className={
          "text-grey-700 bg-grey-700 rounded-xs my-[0.45rem] h-[1.6rem] w-40 animate-pulse"
        }
      />
    )

  return (
    <button
      onClick={() => step === "form" && setStep("select")}
      className={classNames(
        "bg-pill flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-light",
        step !== "form" && "cursor-not-allowed",
      )}
    >
      <SettingsIcon className="text-body-secondary" />
      <div>{isError || !poolName ? defaultPoolName : poolName}</div>
    </button>
  )
}
