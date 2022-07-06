import { ToBufferInputTypes, bufferToHex, publicToAddress, toBuffer } from "@ethereumjs/util"
import {
  MessageTypes,
  SignTypedDataVersion,
  TypedDataUtils,
  TypedMessage,
  extractPublicKey,
} from "@metamask/eth-sig-util"
import { bufferToU8a } from "@polkadot/util"
import { isHexString } from "ethers/lib/utils"

export const getEthDerivationPath = (index: number = 0) => `/m/44'/60'/0'/0/${index}`

export const encodeTypedData = <T extends MessageTypes>(
  typedData: TypedMessage<T>,
  version: SignTypedDataVersion.V3 | SignTypedDataVersion.V4
): Buffer => {
  if (![SignTypedDataVersion.V3, SignTypedDataVersion.V4].includes(version))
    throw new Error(`Invalid version: ${version}`)

  const sanitizedData = TypedDataUtils.sanitizeData(typedData)
  const parts = [Buffer.from("1901", "hex")]
  parts.push(
    TypedDataUtils.hashStruct("EIP712Domain", sanitizedData.domain, sanitizedData.types, version)
  )

  if (sanitizedData.primaryType !== "EIP712Domain") {
    parts.push(
      TypedDataUtils.hashStruct(
        sanitizedData.primaryType as string,
        sanitizedData.message,
        sanitizedData.types,
        version
      )
    )
  }

  return Buffer.concat(parts)
}

export const encodeTextData = (message: Buffer, withSafePrefix: boolean) => {
  const safePrefix = Buffer.from(`\u0019Ethereum Signed Message:\n${message.length}`, "utf-8")
  const parts: Buffer[] = withSafePrefix ? [safePrefix] : []
  return bufferToU8a(Buffer.concat([...parts, message]))
}

export function legacyToBuffer(value: unknown) {
  return typeof value === "string" && !isHexString(value)
    ? Buffer.from(value)
    : toBuffer(value as ToBufferInputTypes)
}

export const recoverPersonalSignAddress = (data: string, signature: string) => {
  const pubKey = extractPublicKey({ data, signature })
  return bufferToHex(publicToAddress(toBuffer(pubKey)))
}
