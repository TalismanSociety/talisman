import { hexToU8a } from "@polkadot/util"
import { Chain } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import useChain from "@ui/hooks/useChain"

import { QrCode } from "./QrCode"

type Props = { genesisHash: string }

export const NetworkSpecsQrCode = ({ genesisHash }: Props) => {
  const polkadot = useChain("polkadot")
  const kusama = useChain("kusama")
  const westend = useChain("westend")

  const { data, isLoading, error } = useQuery({
    queryKey: ["chainSpecsQr", genesisHash],
    queryFn: async () => {
      const hexData = await api.generateChainSpecsQr(genesisHash)
      return hexToU8a(hexData)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  // use parity metadata portal for these chains
  const chain = new Map<string | null | undefined, Chain | undefined>()
    .set(polkadot?.genesisHash, polkadot)
    .set(kusama?.genesisHash, kusama)
    .set(westend?.genesisHash, westend)
    .get(genesisHash)
  const chainspecQrUrl = chain?.chainspecQrUrl
  if (chainspecQrUrl) return <img className="relative h-full w-full" src={chainspecQrUrl} />

  if (isLoading || error) return null

  return <QrCode data={data} />
}
