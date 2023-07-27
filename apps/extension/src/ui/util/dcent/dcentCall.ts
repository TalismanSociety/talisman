export class DcentError extends Error {
  public readonly code: string

  constructor(code: string, msg: string) {
    super(msg)

    this.code = code

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, DcentError.prototype)
  }
}

type DcentResponseStatus = "success" | "error"

type DcentResponseHeader<S extends DcentResponseStatus> = {
  version: string
  request_from: string
  status: S
}

type DcentResponseBodySuccess<T> = {
  command: string
  parameter: T
}

type DcentResponseBodyError = {
  command: string
  error: {
    code: string
    message: string
  }
}

type DcentResponseSuccess<T> = {
  header: DcentResponseHeader<"success">
  body: DcentResponseBodySuccess<T>
}

type DcentResponseError = {
  header: DcentResponseHeader<"error">
  body: DcentResponseBodyError
}

export type DcentResponse<T> = DcentResponseSuccess<T> | DcentResponseError

const isDcentResponseError = <T>(
  response: DcentResponse<T> | unknown
): response is DcentResponseError => {
  try {
    return (response as DcentResponse<T>).header.status === "error"
  } catch (err) {
    return false
  }
}

const isDcentResponseSuccess = <T>(
  response: DcentResponse<T>
): response is DcentResponseSuccess<T> => {
  return response.header.status === "success"
}

export const dcentCall = async <T>(func: () => Promise<DcentResponse<T>>): Promise<T> => {
  try {
    const res = (await func()) as DcentResponse<T>
    if (isDcentResponseSuccess(res)) return res.body.parameter
    throw new Error("unexpected dcent response")
  } catch (err) {
    if (isDcentResponseError(err)) throw new DcentError(err.body.error.code, err.body.error.message)
    throw err
  }
}
