import { log } from "extension-shared"
import pako from "pako"

import { db, DbBlobId } from "./db"

export const updateDbBlob = async <Id extends DbBlobId, Data extends { id: Id }>(
  id: Id,
  data: Data
) => {
  await db.blobs.put({ id, data: pako.deflate(JSON.stringify(data)) })
}

export const getDbBlob = async <Id extends DbBlobId, Data extends { id: Id }>(
  id: Id
): Promise<Data | null> => {
  try {
    const blob = await db.blobs.get(id)
    if (!blob?.data) return null

    return JSON.parse(pako.inflate(blob.data, { to: "string" })) as Data
  } catch (err) {
    log.error("Error parsing blob data", { id, err })
    return null
  }
}
