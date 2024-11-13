import { SettingsIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"

import { useBondWizard } from "../Bond/useBondWizard"
import { useGetBittensorValidator } from "../hooks/bittensor/useGetBittensorValidator"
import { useNomPoolName } from "../hooks/nomPools/useNomPoolName"

export const BondPoolName = ({ poolId }: { poolId: string | number | undefined | null }) => {
  const { setStep, step, token } = useBondWizard()

  const { id: chainId } = token?.chain || {}

  let data,
    isLoading = false,
    isError = false,
    poolName,
    defaultPoolName = "Talisman Pool"

  const hookMap = {
    nominationPool: useNomPoolName,
    bittensor: useGetBittensorValidator,
  }

  switch (chainId) {
    case "bittensor":
      ;({ data, isLoading, isError } = hookMap["bittensor"](poolId as unknown as string))
      poolName = data?.data?.[0].name || ""
      poolName = (
        <button
          onClick={() => step === "form" && setStep("select")}
          className={classNames(
            "bg-pill flex items-center gap-2 rounded-xl p-4 text-xs font-light",
            step !== "form" && "cursor-not-allowed",
          )}
        >
          <SettingsIcon className="text-body-secondary" />
          <div>{poolName}</div>
        </button>
      )

      defaultPoolName = "Bittensor Pool"
      break
    default:
      ;({ data, isLoading, isError } = hookMap["nominationPool"](
        chainId,
        poolId as unknown as number,
      ))
      poolName = data || ""
      break
  }

  if (isError) return <>{defaultPoolName}</>

  if (isLoading || !poolName)
    return (
      <div
        className={classNames(
          "text-grey-700 bg-grey-700 rounded-xs h-[1.6rem] w-40 animate-pulse",
          chainId === "bittensor" && "my-[0.85rem]",
        )}
      />
    )

  return <>{poolName}</>
}
