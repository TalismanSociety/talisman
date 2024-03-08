import { SignerPayloadGenesisHash } from "@extension/core"
import { IS_FIREFOX } from "@extension/shared"
import { hexToU8a } from "@polkadot/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { useImageLoaded } from "@ui/hooks/useImageLoaded"

import { QrCode, QrCodeError } from "./QrCode"
import { QrCodeSource, qrCodeLogoForSource } from "./QrCodeSourceSelector"

type Props = { genesisHash: SignerPayloadGenesisHash; qrCodeSource: QrCodeSource }

export const NetworkSpecsQrCode = ({ genesisHash, qrCodeSource }: Props) => {
  const chain = useChainByGenesisHash(genesisHash)
  const chainspecQrUrl = chain?.chainspecQrUrl

  const { data, isLoading, error } = useQuery({
    queryKey: ["chainSpecsQr", genesisHash],
    queryFn: async () => {
      const hexData = await api.generateChainSpecsQr(genesisHash)
      return hexToU8a(hexData)
    },
    enabled: qrCodeSource === "talisman",
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const qrCodeLogo = qrCodeLogoForSource(qrCodeSource)
  const [ref, loaded, onLoad] = useImageLoaded()
  if (chainspecQrUrl && qrCodeSource !== "talisman")
    return (
      <>
        <img
          className="absolute h-full w-full rounded p-2"
          src={chainspecQrUrl}
          ref={ref}
          onLoad={onLoad}
          onLoadedData={onLoad}
          alt=""
          crossOrigin={IS_FIREFOX ? undefined : "anonymous"}
        />
        {loaded && qrCodeLogo ? (
          <img
            className="absolute left-1/2 top-1/2 w-11 -translate-x-1/2 -translate-y-1/2 bg-white p-2"
            src={qrCodeLogo}
            alt=""
          />
        ) : null}
      </>
    )

  if (isLoading) return null
  if (error) return <QrCodeError error={String(error)} />
  return <QrCode data={data} />
}
