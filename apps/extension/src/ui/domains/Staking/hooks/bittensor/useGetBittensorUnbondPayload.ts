import { Enum } from "@polkadot-api/substrate-bindings"
import { ScaleApi } from "@talismn/sapi"
import { tokensToPlanck } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { Binary } from "polkadot-api"
import { useMemo } from "react"

import {
  ROOT_NETUID,
  TALISMAN_FEE_RECEIVER_ADDRESS_BITTENSOR,
} from "../../Bittensor/utils/constants"

type GetBittensorUnbondPayload = {
  sapi: ScaleApi
  address: string
  hotkey: string
  plancks: bigint
  talismanFee: bigint
  alphaPriceWithSlippagePlanks: bigint
  netuid: number
}

const getBittensorUnbondPayload = ({
  sapi,
  address,
  hotkey,
  plancks,
  netuid,
  alphaPriceWithSlippagePlanks,
  talismanFee,
}: GetBittensorUnbondPayload) => {
  if (netuid === ROOT_NETUID) {
    return sapi.getExtrinsicPayload(
      "Utility",
      "batch_all",
      {
        calls: [
          sapi.getDecodedCall("SubtensorModule", "remove_stake", {
            hotkey: hotkey,
            netuid: ROOT_NETUID,
            amount_unstaked: plancks,
          }),
          sapi.getDecodedCall("System", "remark_with_event", {
            remark: Binary.fromText("talisman-bittensor"),
          }),
        ],
      },
      { address },
    )
  }
  return sapi.getExtrinsicPayload(
    "Utility",
    "batch_all",
    {
      calls: [
        sapi.getDecodedCall("SubtensorModule", "remove_stake_limit", {
          hotkey,
          netuid,
          amount_unstaked: plancks,
          limit_price: alphaPriceWithSlippagePlanks,
          allow_partial: false,
        }),
        sapi.getDecodedCall("Balances", "transfer_keep_alive", {
          dest: Enum("Id", TALISMAN_FEE_RECEIVER_ADDRESS_BITTENSOR),
          value: talismanFee,
        }),
        sapi.getDecodedCall("System", "remark_with_event", {
          remark: Binary.fromText("talisman-bittensor"),
        }),
      ],
    },
    { address },
  )
}

type UseGetBittensorUnbondPayload = {
  sapi: ScaleApi | undefined | null
  isEnabled: boolean
  address: string | undefined | null
  hotkey: string | null | undefined
  plancks: bigint | null | undefined
  alphaPriceWithSlippage: number
  talismanFee: bigint
  netuid: number | null
}

export const useGetBittensorUnbondPayload = ({
  sapi,
  address,
  hotkey,
  isEnabled,
  plancks,
  talismanFee,
  alphaPriceWithSlippage,
  netuid,
}: UseGetBittensorUnbondPayload) => {
  const tokenDecimals = 9

  const alphaPriceWithSlippagePlanks = useMemo(() => {
    const alphaPricePlancks = tokensToPlanck(String(alphaPriceWithSlippage), tokenDecimals)
    const rounded = Math.round(parseFloat(alphaPricePlancks))
    return BigInt(rounded)
  }, [alphaPriceWithSlippage])

  return useQuery({
    queryKey: [
      "SubtensorModule",
      "RemoveStake",
      sapi?.id,
      hotkey,
      netuid,
      address,
      plancks?.toString() ?? "0",
      alphaPriceWithSlippage,
      talismanFee?.toString() ?? "0",
    ],
    queryFn: async () => {
      if (!sapi || !address || !hotkey) return null
      if (typeof netuid !== "number") return null
      return getBittensorUnbondPayload({
        sapi,
        address,
        hotkey,
        netuid,
        plancks: plancks ?? 0n,
        talismanFee,
        alphaPriceWithSlippagePlanks,
      })
    },
    enabled: !!sapi && !!address && isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
