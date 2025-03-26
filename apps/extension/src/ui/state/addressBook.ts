import { bind } from "@react-rxjs/core"
import { map } from "rxjs"

import { accounts$ } from "./accounts"

export const [useContacts, contacts$] = bind(
  accounts$.pipe(map((accounts) => accounts.filter((acc) => acc.type === "contact"))),
)
