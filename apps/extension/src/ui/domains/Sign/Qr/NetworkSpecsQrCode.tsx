import { hexToU8a } from "@polkadot/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"

import { QrCode } from "./QrCode"

type Props = { genesisHash: string }

export const NetworkSpecsQrCode = ({ genesisHash }: Props) => {
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

  if (isLoading || error) return null

  return <QrCode data={data} />
}
