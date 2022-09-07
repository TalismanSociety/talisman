import { AccountMeta } from "@core/domains/accounts/types"
import { SigningRequestsStore } from "@core/domains/signing/requestsStore"
import RequestExtrinsicSign from "@polkadot/extension-base/background/RequestExtrinsicSign"
import { AccountsStore } from "@polkadot/extension-base/stores"
import type { SignerPayloadJSON } from "@polkadot/types/types"
import keyring from "@polkadot/ui-keyring"
import { cryptoWaitReady } from "@polkadot/util-crypto"

import AppHandler from "../handler"
import passwordStore from "../store.password"

const mnemonic = "seed sock milk update focus rotate barely fade car face mechanic mercy"
const password = "passw0rd"

const createAccount = (origin: AccountMeta["origin"] = "DERIVED") => {
  const { pair } = keyring.addUri(mnemonic, password, {
    name: "Test Account",
    origin,
  } as AccountMeta)
  return pair
}

describe("Signing requests store", () => {
  beforeAll(async () => {
    await cryptoWaitReady()

    keyring.loadAll({ store: new AccountsStore() })
  })

  test("migrate password v1 -> v2", async () => {
    expect((await passwordStore.get("passwordVersion")) === 1)

    // create 4 accounts
    createAccount("ROOT")
    Array(3).forEach(createAccount)
  })
})

// load bearing export
export {}
