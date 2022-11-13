import { getCoinGeckoErc20Coin } from "@core/util/getCoinGeckoErc20Coin"
import { useQuery } from "@tanstack/react-query"
import { getBase64ImageUrl } from "talisman-utils"
import genericTokenSvgIcon from "@talisman/theme/icons/custom-token-generic.svg?url"
import { imgSrcToBlob } from "blob-util"
import useTokens from "./useTokens"
import { useMemo } from "react"
import { CustomErc20Token, Token } from "@core/domains/tokens/types"

const genericTokenIconUrl = getBase64ImageUrl(genericTokenSvgIcon)

type ImageSize = "thumb" | "small" | "large"

const getErc20TokenImageUrl = async (
  evmNetworkId?: number,
  address?: string,
  iconSize: ImageSize = "small",
  token?: CustomErc20Token
) => {
  if (token?.image) {
    try {
      const blob = await imgSrcToBlob(token.image)
      return URL.createObjectURL(blob)
    } catch (err) {
      // ignore, there could be many reasons
    }
  }

  if (evmNetworkId && address) {
    const data = await getCoinGeckoErc20Coin(evmNetworkId, address)

    if (data) {
      try {
        const blob = await imgSrcToBlob(data.image[iconSize])
        return URL.createObjectURL(blob)
      } catch (err) {
        // ignore, there could be many reasons
        // fallback to generic token url
      }
    }
  }
  return genericTokenIconUrl
}

export const useErc20TokenImageUrl = (
  evmNetworkId?: number,
  address?: string,
  iconSize: ImageSize = "small"
) => {
  const tokens = useTokens()
  const token = useMemo(() => {
    return tokens?.find(
      (t) =>
        t.type === "erc20" &&
        Number(t.evmNetwork?.id) === Number(evmNetworkId) &&
        t.contractAddress === address
    ) as CustomErc20Token
  }, [address, evmNetworkId, tokens])

  return useQuery({
    queryKey: [evmNetworkId, address, iconSize, token?.id],
    queryFn: () => getErc20TokenImageUrl(evmNetworkId, address, iconSize, token),
  })
}
