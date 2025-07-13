import i18next, { TFunction } from "i18next"
import { Observable, shareReplay } from "rxjs"

export const t$ = new Observable<TFunction>((subscriber) => {
  const handleLanguageChanged = (lng: string) => {
    subscriber.next(i18next.getFixedT(lng))
  }

  // init immediately
  subscriber.next(i18next.getFixedT(i18next.language))

  i18next.on("languageChanged", handleLanguageChanged)

  return () => {
    i18next.off("languageChanged", handleLanguageChanged)
  }
}).pipe(shareReplay(1))
