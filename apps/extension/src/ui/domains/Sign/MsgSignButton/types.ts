import { SignerPayloadRaw } from "extension-core"

export type MsgSignButtonPayloadDot = {
  platform: "polkadot"
  payload: SignerPayloadRaw
}

export type MsgSignButtonPayloadEth = {
  platform: "ethereum"
  address: `0x${string}`
  message: Buffer<ArrayBufferLike>
}

export type MsgSignButtonPayloadSol = {
  platform: "solana"
  address: string
  message: Buffer<ArrayBufferLike> // Message ?
}

export type MsgSignButtonPayload =
  | MsgSignButtonPayloadDot
  | MsgSignButtonPayloadEth
  | MsgSignButtonPayloadSol

type TransactionPlatform = MsgSignButtonPayload["platform"]

export type MsgSignButtonProps<
  Platform extends TransactionPlatform | undefined = undefined,
  Payload = Platform extends "polkadot"
    ? MsgSignButtonPayloadDot
    : Platform extends "ethereum"
      ? MsgSignButtonPayloadEth
      : Platform extends "solana"
        ? MsgSignButtonPayloadSol
        : MsgSignButtonPayload | null | undefined,
> = {
  payload: Payload
  containerId?: string
  label?: string
  className?: string
  disabled?: boolean
  onSubmit: (signature?: string) => void
}
