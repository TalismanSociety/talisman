const transform = (body: BodyInit, stream: CompressionStream | DecompressionStream) =>
  new Response(new Response(body).body?.pipeThrough(stream))

export const deflateJson = async (data: unknown) =>
  new Uint8Array(
    await transform(JSON.stringify(data), new CompressionStream("deflate")).arrayBuffer()
  )

export const inflateJson = (bytes: Uint8Array<ArrayBuffer>): Promise<unknown> =>
  transform(bytes, new DecompressionStream("deflate")).json()
