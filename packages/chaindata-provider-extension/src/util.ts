import { Observable, firstValueFrom } from "rxjs"

export const itemsToIds = <T extends { id: string }>(items: T[]): string[] =>
  items.map(({ id }) => id)

export const itemsToMapById = <T extends { id: string }>(items: T[]): Record<string, T> =>
  Object.fromEntries(items.map((item) => [item.id, item]))

export const itemsToMapByGenesisHash = <T extends { genesisHash: string | null }>(
  items: T[]
): Record<string, T> =>
  Object.fromEntries(items.flatMap((item) => (item.genesisHash ? [[item.genesisHash, item]] : [])))

type ObservableReturnType<O> = O extends Observable<infer T> ? T : O

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const wrapObservableWithGetter = async <O extends Observable<any>>(
  errorReason: string,
  observable: O
): Promise<ObservableReturnType<O>> => {
  return await withErrorReason(errorReason, () => firstValueFrom(observable))
}

export const withErrorReason = <T>(reason: string, task: () => T): T => {
  try {
    return task()
  } catch (cause) {
    throw new Error(reason, { cause })
  }
}
