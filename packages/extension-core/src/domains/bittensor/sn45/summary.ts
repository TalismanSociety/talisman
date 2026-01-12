import { BehaviorSubject } from "rxjs"

const subjectSummary = new BehaviorSubject<string>("")
export const summary$ = subjectSummary.asObservable()
