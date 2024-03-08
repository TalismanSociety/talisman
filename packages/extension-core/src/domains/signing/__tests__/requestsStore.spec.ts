import RequestExtrinsicSign from "@polkadot/extension-base/background/RequestExtrinsicSign"
import { AccountsStore } from "@polkadot/extension-base/stores"
import type { SignerPayloadJSON } from "@polkadot/types/types"
import keyring from "@polkadot/ui-keyring"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import { watCryptoWaitReady } from "@talismn/scale"
import { waitFor } from "@testing-library/dom"

import { AccountType } from "../../../domains/accounts/types"
import { signSubstrate } from "../../../domains/signing/requests"
import { requestStore } from "../../../libs/requests/store"
import { windowManager } from "../../../libs/WindowManager"

const mnemonic = "seed sock milk update focus rotate barely fade car face mechanic mercy"
const password = "passw0rd"

const createAccount = () => {
  const { pair } = keyring.addUri(mnemonic, password, {
    name: "Test Account",
    origin: AccountType.Talisman,
  })
  return pair
}

jest.mock("../../../libs/WindowManager", () => {
  return {
    windowManager: {
      popupOpen: jest.fn().mockImplementation(async () => {
        return 1
      }),
    },
  }
})

describe("Signing requests store", () => {
  beforeAll(async () => {
    await Promise.all([
      // wait for `@polkadot/util-crypto` to be ready (it needs to load some wasm)
      cryptoWaitReady(),
      // wait for `@talismn/scale` to be ready (it needs to load some wasm)
      watCryptoWaitReady(),
    ])

    keyring.loadAll({ store: new AccountsStore() })
  })

  test("create request method", async () => {
    const { address, meta } = createAccount()
    const payload: SignerPayloadJSON = {
      address,
      blockHash: "0xe1b1dda72998846487e4d858909d4f9a6bbd6e338e4588e5d809de16b1317b80",
      blockNumber: "0x00000393",
      era: "0x3601",
      genesisHash: "0x242a54b35e1aad38f37b884eddeb71f6f9931b02fac27bf52dfb62ef754e5e62",
      method: "0x040105fa8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4882380100",
      nonce: "0x0000000000000000",
      signedExtensions: [
        "CheckSpecVersion",
        "CheckTxVersion",
        "CheckGenesis",
        "CheckMortality",
        "CheckNonce",
        "CheckWeight",
        "ChargeTransactionPayment",
      ],
      specVersion: "0x00000026",
      tip: "0x00000000000000000000000000000000",
      transactionVersion: "0x00000005",
      version: 4,
    }

    expect(requestStore.getCounts().get("substrate-sign")).toBe(0)
    signSubstrate(
      "http://test.com",
      new RequestExtrinsicSign(payload),
      {
        address,
        ...meta,
      },
      {} as chrome.runtime.Port
    )

    await waitFor(() => expect(requestStore.getCounts().get("substrate-sign")).toBe(1))
    expect(windowManager.popupOpen).toBeCalled()
  })
})

// load bearing export
export {}
