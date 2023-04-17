import { QrScanAddress } from "@polkadot/react-qr"
import { QrScanSignature } from "@polkadot/react-qr"

type Types = "address" | "signature"
type CommonProps<T extends Types> = {
  type: T
  enable?: boolean
  error?: boolean
  size?: string | number
}

type AddressProps = {
  onScan: Parameters<typeof QrScanAddress>[0]["onScan"]
  onError?: Parameters<typeof QrScanAddress>[0]["onError"]
}

type SignatureProps = {
  onScan: Parameters<typeof QrScanSignature>[0]["onScan"]
  onError?: Parameters<typeof QrScanSignature>[0]["onError"]
}

type Props<T> = T extends "address"
  ? CommonProps<T> & AddressProps
  : T extends "signature"
  ? CommonProps<T> & SignatureProps
  : never

export const ScanQr = <T extends Types>({
  type,
  enable = true,
  error = false,
  onScan,
  onError,
  size = 260,
}: Props<T>) => {
  const scanner =
    type === "address" ? (
      <QrScanAddress
        className="[&>section>section]:rounded-xl [&>section>section>div:first-child]:hidden [&>section>section>video]:bg-transparent [&>section>section>video]:blur-sm"
        onScan={onScan}
        onError={onError}
        size={size ?? 260}
      />
    ) : type === "signature" ? (
      <QrScanSignature
        className="[&>section>section]:rounded-xl [&>section>section>div:first-child]:hidden [&>section>section>video]:bg-transparent [&>section>section>video]:blur-sm"
        onScan={onScan}
        onError={onError}
        size={size ?? 260}
      />
    ) : null

  return (
    <div
      className="bg-grey-900 relative rounded-xl"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {enable ? scanner : null}
      <CameraMarker className="absolute top-0 left-0 h-full w-full" active={enable} error={error} />
    </div>
  )
}

const CameraMarker = ({
  className,
  active,
  error,
}: {
  className?: string
  active: boolean
  error: boolean
}) => {
  const bg = error ? "bg-alert-error" : active ? "bg-white" : "bg-grey-800"
  const width = (horizontal: boolean) => (horizontal ? "w-2" : "h-2")
  const length = (horizontal: boolean) => (horizontal ? "h-1/5" : "w-1/5")
  const horizontal = `${width(true)} ${length(true)}`
  const vertical = `${width(false)} ${length(false)}`

  return (
    <div className={className}>
      <div className={`absolute top-10 left-10 rounded ${horizontal} ${bg}`} />
      <div className={`absolute top-10 left-10 rounded ${vertical} ${bg}`} />

      <div className={`absolute bottom-10 left-10 rounded ${horizontal} ${bg}`} />
      <div className={`absolute bottom-10 left-10 rounded ${vertical} ${bg}`} />

      <div className={`absolute right-10 top-10 rounded ${horizontal} ${bg}`} />
      <div className={`absolute right-10 top-10 rounded ${vertical} ${bg}`} />

      <div className={`absolute bottom-10 right-10 rounded ${horizontal} ${bg}`} />
      <div className={`absolute bottom-10 right-10 rounded ${vertical} ${bg}`} />
    </div>
  )
}
