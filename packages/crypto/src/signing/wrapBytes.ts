// Inspired from MIT licensed polkadot-api getSignBytes method
// https://github.com/polkadot-api/polkadot-api/blob/c3cec20c4345fa39b587e056695dd754fd13f05d/packages/signers/signers-common/src/sign-bytes.ts#L8

/**
 * Wraps bytes before signing with a Polkadot signer
 * @param data
 * @returns
 */
export const wrapBytes = (data: Uint8Array) => {
  const preBytes = new TextEncoder().encode("<Bytes>")
  const postBytes = new TextEncoder().encode("</Bytes>")

  let isPadded = true
  let i: number

  for (i = 0; isPadded && i < preBytes.length; i++) isPadded = preBytes[i] === data[i]
  isPadded = isPadded && i === preBytes.length

  const postDataStart = data.length - postBytes.length
  for (i = 0; isPadded && i < postBytes.length; i++)
    isPadded = postBytes[i] === data[postDataStart + i]
  isPadded = isPadded && i === postBytes.length

  if (isPadded) return data

  const padded = new Uint8Array(data.length + preBytes.length + postBytes.length)
  padded.set(preBytes)
  padded.set(data, preBytes.length)
  padded.set(postBytes, preBytes.length + data.length)

  return padded
}
