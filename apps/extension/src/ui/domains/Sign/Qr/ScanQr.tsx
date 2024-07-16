import { decodeAddress } from "@polkadot/util-crypto"
import { ChevronDownIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { selectedVideoInputAtom, videoInputDevicesAtom } from "@ui/atoms"
import { BrowserQRCodeReader } from "@zxing/browser"
import { useAtom, useAtomValue } from "jotai"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useClickAway } from "react-use"
import { Toggle } from "talisman-ui"

type Types = "address" | "signature"
type CommonProps<T extends Types> = {
  type: T
  enable?: boolean
  error?: boolean
  size?: string | number
}

type AddressProps = {
  onScan: (scanned: {
    isAddress: boolean
    content: string
    genesisHash: `0x${string}` | null
    name?: string | undefined
  }) => void
  onError?: (error: Error) => void
}

type SignatureProps = {
  onScan: (scanned: { signature: `0x${string}` }) => void
  onError?: (error: Error) => void
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
  const { t } = useTranslation()

  const [blur, setBlur] = useState(true)

  const handleScan = useCallback(
    (data: string) => {
      try {
        if (type === "address") return onScan(parseAddress(data))
        if (type === "signature") return onScan(parseSignature(data))
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error("Scanning error", { cause })
        console.error(error) // eslint-disable-line no-console
        onError?.(error)
      }
    },
    [onError, onScan, type]
  )

  return (
    <div className="flex flex-col gap-2">
      <div
        className="bg-grey-900 relative overflow-hidden rounded-xl"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {enable ? <Scanner onScan={handleScan} onError={onError} blur={blur} /> : null}
        <CameraMarker
          className="pointer-events-none absolute left-0 top-0 h-full w-full"
          active={enable}
          error={error}
        />
      </div>
      {enable && (
        <span className={`flex w-[${size}px] justify-end`}>
          <Toggle
            checked={blur}
            onChange={({ target }) => setBlur(target.checked)}
            className="text-grey-300 text-sm"
          >
            {t("Blur image for privacy")}
          </Toggle>
        </span>
      )}
    </div>
  )
}

const Scanner = ({
  onScan,
  onError,
  blur = true,
}: {
  onScan: (data: string) => void
  onError?: (error: Error) => void
  blur?: boolean
}) => {
  const preview = useRef<HTMLVideoElement>(null)

  const [selectedVideoInput, selectVideoInput] = useAtom(selectedVideoInputAtom)
  const inputDevices = useAtomValue(videoInputDevicesAtom)
  const [showInputMenu, setShowInputMenu] = useState(false)
  const inputMenu = useRef(null)
  useClickAway(inputMenu, () => setShowInputMenu(false))

  useEffect(() => {
    if (!preview.current) return

    const aborted = new AbortController()

    const codeReader = new BrowserQRCodeReader()

    codeReader
      .decodeFromVideoDevice(selectedVideoInput, preview.current, (result, error, controls) => {
        if (aborted.signal.aborted) return
        if (error?.name === "NotFoundException") return

        if (error) onError?.(new Error(error.name, { cause: error }))
        if (!result) return

        const data = result.toString()
        controls.stop()

        onScan(data)
      })
      .then((controls) => (aborted.signal.onabort = () => controls.stop()))

    return () => aborted.abort()
  }, [onError, onScan, selectedVideoInput])

  return (
    <div className="absolute h-full w-full">
      <video
        ref={preview}
        className={`absolute h-full w-full -scale-x-100 object-cover${blur ? " blur-sm" : ""}`}
      />
      {inputDevices.length > 1 ? (
        <div className="absolute left-1/2 top-10 -translate-x-1/2">
          <ChevronDownIcon
            className="cursor-pointer text-lg"
            onClick={() => setShowInputMenu((shown) => !shown)}
          />
        </div>
      ) : null}
      {showInputMenu ? (
        <div
          ref={inputMenu}
          className="bg-black-tertiary absolute left-1/2 top-24 max-h-80 w-96 -translate-x-1/2 space-y-4 overflow-y-scroll rounded p-4"
        >
          {inputDevices.map((device) => (
            <button
              key={device.deviceId}
              type="button"
              className="flex w-full items-center gap-3 text-sm"
              onClick={() => selectVideoInput(device.deviceId)}
            >
              <div
                className={classNames(
                  "h-4 w-4 shrink-0 rounded-full",
                  device.deviceId === selectedVideoInput ? "bg-primary" : "bg-grey-700"
                )}
              />
              <span className="truncate">{device.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Parse a Polkadot Vault address.
 *
 * Should roughly mirror the `ScanAddress.onScan` handler from `@polkadot/react-qr`:
 * https://github.com/polkadot-js/ui/blob/06c2fe04636473f7bf8133114d7b08acda15a32b/packages/react-qr/src/ScanAddress.tsx#L30-L69
 */
const parseAddress = (data: string) => {
  const [prefix, address, ...rest] = data.split(":")

  const validPrefixes = ["substrate", "secret", "ethereum"]
  const isValidPrefix = validPrefixes.includes(prefix)
  if (!isValidPrefix)
    throw new Error(
      `Invalid prefix received, expected '${validPrefixes.join("' or '")}', found '${prefix}'`
    )

  const isSubstrateAddress = prefix === "substrate"
  const isEthereumAddress = prefix === "ethereum"
  const isAddress = isSubstrateAddress || isEthereumAddress
  if (isSubstrateAddress) decodeAddress(address) // throws if invalid

  const genesisHash = isEthereumAddress ? null : rest[0]
  const name = isEthereumAddress ? rest.slice(1) : rest
  const content = isEthereumAddress ? address.slice(0, 42) : address

  return {
    content,
    genesisHash: genesisHash?.startsWith("0x") ? (genesisHash as `0x${string}`) : null,
    isAddress,
    name: name?.length ? name.join(":") : undefined,
  }
}
/**
 * Parse a Polkadot Vault tx signature.
 *
 * Should roughly mirror the `ScanSignature.onScan` handler from `@polkadot/react-qr`:
 * https://github.com/polkadot-js/ui/blob/b61b7f25b8c4e273ce4e12ecd67d1398fe3c7815/packages/react-qr/src/ScanSignature.tsx#L23-L26
 */
const parseSignature = (data: string): { signature: `0x${string}` } => ({ signature: `0x${data}` })

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
      <div className={`absolute left-10 top-10 rounded ${horizontal} ${bg}`} />
      <div className={`absolute left-10 top-10 rounded ${vertical} ${bg}`} />

      <div className={`absolute bottom-10 left-10 rounded ${horizontal} ${bg}`} />
      <div className={`absolute bottom-10 left-10 rounded ${vertical} ${bg}`} />

      <div className={`absolute right-10 top-10 rounded ${horizontal} ${bg}`} />
      <div className={`absolute right-10 top-10 rounded ${vertical} ${bg}`} />

      <div className={`absolute bottom-10 right-10 rounded ${horizontal} ${bg}`} />
      <div className={`absolute bottom-10 right-10 rounded ${vertical} ${bg}`} />
    </div>
  )
}
