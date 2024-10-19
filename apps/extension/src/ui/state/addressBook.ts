import { bind } from "@react-rxjs/core"
import { addressBookStore } from "extension-core"
import { map } from "rxjs"

export const [useContacts, contacts$] = bind(addressBookStore.observable.pipe(map(Object.values)))
