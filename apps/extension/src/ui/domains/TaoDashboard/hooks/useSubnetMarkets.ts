import { isNotNil } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useTaoDashboardNetworkId } from "../shared/TaoDashboardNetworkProvider"
import { raoToTao } from "../shared/util"

type DynamicInfo = {
  netuid: number
  alpha_in: bigint
  alpha_out: bigint
  tao_in: bigint
  tao_in_emission: bigint
}

type AlphaPrice = { netuid: number; price: bigint }

export type SubnetMarket = {
  priceTao: number
  stakedTao: number
  stakedAlpha: number
  mcapTao: number | null
  emissionPct: number
}

/**
 * A subnet's emission share counts both halves of its TAO emission: the liquidity injection
 * (`tao_in_emission`) and the chain buy (`SubnetExcessTao`).
 */
export const getSubnetMarkets = ({
  dynamicInfos,
  alphaPrices,
  excessTaoByNetuid,
}: {
  dynamicInfos: (DynamicInfo | null | undefined)[]
  alphaPrices: AlphaPrice[]
  excessTaoByNetuid: Map<number, bigint>
}): Map<number, SubnetMarket> => {
  const infos = dynamicInfos.filter(isNotNil)
  const priceByNetuid = new Map(alphaPrices.map(({ netuid, price }) => [netuid, price]))

  const getEmission = (info: DynamicInfo) =>
    info.netuid === 0 ? 0n : info.tao_in_emission + (excessTaoByNetuid.get(info.netuid) ?? 0n)
  const totalEmission = infos.reduce((total, info) => total + getEmission(info), 0n)

  return new Map(
    infos.flatMap((info): [number, SubnetMarket][] => {
      const price = priceByNetuid.get(info.netuid)
      if (price === undefined) return []

      const priceTao = raoToTao(price)
      return [
        [
          info.netuid,
          {
            priceTao,
            stakedTao: raoToTao(info.tao_in),
            stakedAlpha: raoToTao(info.alpha_out),
            mcapTao: info.netuid === 0 ? null : priceTao * raoToTao(info.alpha_in + info.alpha_out),
            emissionPct: totalEmission
              ? (Number(getEmission(info)) * 100) / Number(totalEmission)
              : 0,
          },
        ],
      ]
    })
  )
}

export const useSubnetMarkets = () => {
  const {
    data: sapi,
    isLoading: isSapiLoading,
    isError: isSapiError,
    error: sapiError,
  } = useScaleApi(useTaoDashboardNetworkId())

  const query = useQuery({
    queryKey: ["subnetMarkets", sapi?.id],
    queryFn: async () => {
      if (!sapi) return null

      const [dynamicInfos, alphaPrices] = await Promise.all([
        sapi.getRuntimeCallValue<(DynamicInfo | null | undefined)[]>(
          "SubnetInfoRuntimeApi",
          "get_all_dynamic_info",
          []
        ),
        sapi.getRuntimeCallValue<AlphaPrice[]>("SwapRuntimeApi", "current_alpha_price_all", []),
      ])

      const netuids = dynamicInfos.filter(isNotNil).map(({ netuid }) => netuid)
      const excessTao = await sapi.getStorageValues<bigint>(
        "SubtensorModule",
        "SubnetExcessTao",
        netuids.map((netuid) => [netuid])
      )
      const excessTaoByNetuid = new Map(netuids.map((netuid, i) => [netuid, excessTao[i] ?? 0n]))

      return getSubnetMarkets({ dynamicInfos, alphaPrices, excessTaoByNetuid })
    },
    enabled: !!sapi,
    refetchInterval: 60_000,
    // no keepPreviousData: the key only changes on network switch, so the previous data
    // would always be the other network's markets
  })

  return {
    ...query,
    isLoading: isSapiLoading || query.isLoading,
    isError: isSapiError || query.isError,
    error: sapiError ?? query.error ?? null,
  }
}
