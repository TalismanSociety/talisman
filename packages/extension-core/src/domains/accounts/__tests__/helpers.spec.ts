import { AccountsStore } from "@polkadot/extension-base/stores"
import uiKeyring from "@polkadot/ui-keyring"
import { KeyringJson } from "@polkadot/ui-keyring/types"

import { hasPrivateKey, hasQrCodeAccounts } from "../helpers"
import { AccountType } from "../types"

describe("hasQrCodeAccounts", () => {
  it("should return true if there are QR code accounts", async () => {
    const localData = {
      "account:0x123": {
        meta: {
          origin: AccountType.Qr,
        },
      },
    }
    // add the local data to the mock storage
    await chrome.storage.local.set(localData)

    expect(await hasQrCodeAccounts()).toEqual(true)
  })

  it("should return false if there are no QR code accounts", async () => {
    const localData = {
      "account:0x123": {
        meta: {
          origin: AccountType.Talisman,
        },
      },
    }
    // add the local data to the mock storage
    await chrome.storage.local.set(localData)

    expect(await hasQrCodeAccounts()).toEqual(false)
  })
})

const pkAddress = "5FnvG6KtVAcqpb5nRfehryjQdV2YVbhrTTS539KAtqfPhxZ5"
const ethPkAddress = "0x87F88cbd2E04eAacCa2fCFfcd866D691f944614E"
const vaultAddress = "5Gn9WCjSgiprhRacM3qrZ4KybvUJQEVQcV2H375A9PdZiq3V"
const watchedAddress = "5F7LiCA6T4DWUDRQyFAWsRqVwxrJEznUtcw4WNnb5fe6snCH"

const accounts = {
  "account:0xa4e6c33067cd498e36c777019d9389e32bdf8b7915809b9be74f3f839ee74a28": {
    address: pkAddress,
    encoded:
      "XJ97EysMihnFZntSJyb9WHb582vUf7cKJCfXxSanwRUAgAAAAQAAAAgAAACakOQ/kE7+GzMBs7d7qQlnxtVqkjbRcy7HXWBVoIwEeHiPUxPUUDiESY6GHiG2sgbqOtIBlxKPISwHPPXJzDyvnK+ozuVMo1zwg93gjVZMLST+3QF0pQjToJZyzlm8ASTcC9HoxWSKHLueDLGC01DLUOOcdH8AGTsp3mmpZdipjLtvikTk5kGOWN7thBOdvj4jhRebcTc5eGoRjoof",
    encoding: {
      content: ["pkcs8", "sr25519"],
      type: ["scrypt", "xsalsa20-poly1305"],
      version: "3",
    },
    meta: {
      name: "My Polkadot Account",
      origin: "ROOT",
      whenCreated: 1687157386323,
    },
  },
  "account:0x5c9eba3b10e45bf6db77267b40b95f3f91fc5f67": {
    address: "0x03c74af9f7835ac3526e1b57e052989a4761aea7a692b7de8a906960e6e5e04556",
    encoded:
      "FW2KKVGCFLfSL3clS3Y7z8rRZ4Oton8vqmPl+v5vdlwAgAAAAQAAAAgAAAD/l1ALA9hU21sTWB+YWBzhurKhZMsnu9mwlIN4R3GazsmVGNdXT+4r+LoRTw7SNAAW+ilW0jTtWCy5zFZhoNQzhI2wlUh3+KmUXdSgWiScSB0asM8+glCiFI4jLm4mdeTXN2sqrC2FtVoSGrB/3tEutVXdpMygPumhu6EZGAs=",
    encoding: {
      content: ["pkcs8", "ethereum"],
      type: ["scrypt", "xsalsa20-poly1305"],
      version: "3",
    },
    meta: {
      derivationPath: "/m/44'/60'/0'/0/0",
      name: "My Ethereum Account",
      origin: "DERIVED",
      parent: "5FnvG6KtVAcqpb5nRfehryjQdV2YVbhrTTS539KAtqfPhxZ5",
      whenCreated: 1687157386746,
    },
  },
  "account:0x86b7409a11700afb027924cb40fa43889d98709ea35319d48fea85dd35004e64": {
    address: watchedAddress,
    encoded: "MFMCAQEwBQYDK2VwBCIEIKEjAyEAhrdAmhFwCvsCeSTLQPpDiJ2YcJ6jUxnUj+qF3TUATmQ=",
    encoding: {
      content: ["pkcs8", "sr25519"],
      type: ["none"],
      version: "3",
    },
    meta: {
      isExternal: true,
      isPortfolio: false,
      name: "Gav",
      origin: "WATCHED",
      whenCreated: 1687316654154,
    },
  },
  "account:0x9c0cb16acf81611cacee75de219ffe2be25c3e641aaffdc49d6167e98017c588": {
    address: "5FbK6dEN2hvAiyNLJLuDSgaXoKp3yDVxdxB81r69KGThfDFK",
    encoded: "MFMCAQEwBQYDK2VwBCIAIZEjAyEAnAyxas+QYRys7nXeIZ/+K+JcPmQar/3EnWFn6YAXxYg=",
    encoding: {
      content: ["pkcs8", "sr25519"],
      type: ["none"],
      version: "3",
    },
    meta: {
      accountIndex: 0,
      addressOffset: 0,
      genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
      hardwareType: "ledger",
      isExternal: true,
      isHardware: true,
      name: "Ledger Polkadot 1",
      origin: "LEDGER",
      whenCreated: 1687316601346,
    },
  },
  "account:0xb44fbcea57d60d77f287e7317a30703e06a18c3e": {
    address: "0xb44fbcea57d60d77f287e7317a30703e06a18c3e",
    encoded: "MFMCAQEwBQYDK2VwBCIEIKEjAyEAtE+86lfWDXfyh+cxejBwPgahjD4=",
    encoding: {
      content: ["pkcs8", "ethereum"],
      type: ["none"],
      version: "3",
    },
    meta: {
      hardwareType: "ledger",
      isHardware: true,
      name: "Ledger Ethereum 1",
      origin: "LEDGER",
      path: "m/44'/60'/0'/0/0",
      whenCreated: 1687316570293,
    },
  },
  "account:0xd08c54d4d67fd38900ac2d809bee18fa6c8b61793e0cb79e740f9509e25c8f50": {
    address: vaultAddress,
    encoded: "MFMCAQEwBQYDK2VwBCIEIKEjAyEA0IxU1NZ/04kArC2Am+4Y+myLYXk+DLeedA+VCeJcj1A=",
    encoding: {
      content: ["pkcs8", "sr25519"],
      type: ["none"],
      version: "3",
    },
    meta: {
      genesisHash: null,
      isExternal: true,
      isQr: true,
      name: "My Polkadot Vault Account",
      origin: "QR",
      whenCreated: 1687316523563,
    },
  },
}

describe("hasPrivateKey", () => {
  beforeAll(async () => {
    const store = new AccountsStore()
    Object.entries(accounts).map(([key, val]) => store.set(key, val as KeyringJson))
    uiKeyring.loadAll({ store })
  })

  it("should return true if there is a private key", async () => {
    expect(hasPrivateKey(pkAddress)).toEqual(true)
  })

  it("should return true if there is an ethereum private key", async () => {
    expect(uiKeyring.getAccount(ethPkAddress)).toBeTruthy()
    expect(hasPrivateKey(ethPkAddress)).toEqual(true)
  })

  it("should return false for qr code accounts", async () => {
    expect(uiKeyring.getAccount(vaultAddress)).toBeTruthy()
    expect(hasPrivateKey(vaultAddress)).toEqual(false)
  })

  it("should return false for watched accounts", async () => {
    expect(uiKeyring.getAccount(watchedAddress)).toBeTruthy()
    expect(hasPrivateKey(watchedAddress)).toEqual(false)
  })
})
