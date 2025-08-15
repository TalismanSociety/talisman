import { catchError, from, map, Observable, of, startWith, switchMap, timer } from "rxjs"

// Designed to be serializable as it can be sent to the frontend
type LoadableError = {
  name: string // can be used to identify the error type
  message: string // display message
}

export type Loadable<T = unknown> =
  | { status: "loading"; data?: T; error?: undefined }
  | { status: "success"; data: T; error?: undefined }
  | { status: "error"; data?: T; error: LoadableError }

export type LoadableStatus = Loadable["status"]

export type LoadableOptions = {
  getError?: (error: unknown) => LoadableError
  refreshInterval?: number
}

export function getLoadable$<T>(
  factory: () => Promise<T>,
  options: LoadableOptions = {},
): Observable<Loadable<T>> {
  const { getError, refreshInterval } = options

  const createLoadableStream = () =>
    from(factory()).pipe(
      map(
        (data): Loadable<T> => ({
          status: "success",
          data,
        }),
      ),
      catchError((error) =>
        of<Loadable<T>>({
          status: "error",
          error: getError ? getError(error) : getGenericError(error),
        }),
      ),
    )

  const source$ = refreshInterval
    ? timer(0, refreshInterval).pipe(switchMap(() => createLoadableStream()))
    : createLoadableStream()

  return source$.pipe(
    startWith<Loadable<T>>({
      status: "loading",
    } as Loadable<T>),
  )
}

const getGenericError = (error: unknown): LoadableError => ({
  name: "Error",
  message: getGenericErrorMessage(error),
})

const getGenericErrorMessage = (error: unknown): string => {
  if (typeof error === "string") {
    return error
  } else if (error instanceof Error) {
    return error.message
  } else if (error && typeof error === "object" && "message" in error) {
    return (error as { message: string }).message
  }
  return String(error) || "Unknown error"
}
