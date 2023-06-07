import Browser from "webextension-polyfill"

import { hasQrCodeAccounts } from "../helpers"
import { AccountTypes } from "../types"

describe("hasQrCodeAccounts", () => {
  it("should return true if there are QR code accounts", async () => {
    const localData = {
      "account:0x123": {
        meta: {
          origin: AccountTypes.QR,
        },
      },
    }
    // add the local data to the mock storage
    await Browser.storage.local.set(localData)

    expect(await hasQrCodeAccounts()).toEqual(true)
  })

  it("should return false if there are no QR code accounts", async () => {
    const localData = {
      "account:0x123": {
        meta: {
          origin: AccountTypes.SEED,
        },
      },
    }
    // add the local data to the mock storage
    await Browser.storage.local.set(localData)

    expect(await hasQrCodeAccounts()).toEqual(false)
  })
})
