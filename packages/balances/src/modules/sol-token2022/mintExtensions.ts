import { unwrapOption } from "@solana/kit"
import type { Mint } from "@solana-program/token-2022"

type Extension = NonNullable<ReturnType<typeof getMintExtensions>>[number]

export const getMintExtensions = (mint: Mint) => unwrapOption(mint.extensions) ?? []

export const getExtension = <TKind extends Extension["__kind"]>(mint: Mint, kind: TKind) =>
  (getMintExtensions(mint).find((ext) => ext.__kind === kind) ?? null) as Extract<
    Extension,
    { __kind: TKind }
  > | null

export const getTransferFeeConfig = (mint: Mint) => getExtension(mint, "TransferFeeConfig")

export const getTransferHook = (mint: Mint) => getExtension(mint, "TransferHook")

export const isNonTransferable = (mint: Mint) => getExtension(mint, "NonTransferable") !== null

export const getTokenMetadata = (mint: Mint) => getExtension(mint, "TokenMetadata")
