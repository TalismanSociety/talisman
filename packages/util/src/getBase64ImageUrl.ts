export const getBase64ImageUrl = (base64: string) => {
  const match = /^data:([^;]*?);base64,(.*?)$/.exec(base64)

  if (!match) return null

  const buffer = Buffer.from(match[2], "base64")
  const blob = new Blob([new Uint8Array(buffer, 0, buffer.length)], { type: match[1] })
  return URL.createObjectURL(blob)
}
