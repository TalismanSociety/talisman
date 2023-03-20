import { hexToU8a } from "@polkadot/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"

import { QrCode } from "./QrCode"

type Props = {
  genesisHash: string
  specVersion: string
}

export const MetadataQrCode = ({ genesisHash, specVersion }: Props) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["chainMetadataQr", genesisHash, specVersion],
    queryFn: async () => {
      const hexData = await api.chainMetadataQr(genesisHash, Number(specVersion))
      return hexToU8a(hexData)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })

  return <QrCode data={data} />
}
