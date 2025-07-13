import i18next, { TFunction } from "i18next"
import { Observable, shareReplay } from "rxjs"

export const t$ = new Observable<TFunction>((subscriber) => {
  const handleUpdate = () => {
    subscriber.next(i18next.t.bind(i18next))
  }

  // init immediately
  handleUpdate()

  i18next.on("languageChanged", handleUpdate)
  i18next.on("initialized", handleUpdate)
  i18next.on("loaded", handleUpdate)

  return () => {
    i18next.off("languageChanged", handleUpdate)
    i18next.off("initialized", handleUpdate)
    i18next.off("loaded", handleUpdate)
  }
}).pipe(shareReplay(1))
