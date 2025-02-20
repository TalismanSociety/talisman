import { bind } from "@react-rxjs/core"
import { AddressBookContact, addressBookStore } from "extension-core"
import { map } from "rxjs"

import { debugObservable } from "./util/debugObservable"

export const [useContacts, contacts$] = bind<AddressBookContact[]>(
  addressBookStore.observable.pipe(map(Object.values), debugObservable("contacts$")),
)
