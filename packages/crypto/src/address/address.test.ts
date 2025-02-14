import { encodeAddressBase58 } from "./encoding/base58"
import { detectAddressEncoding } from "./encoding/detectAddressEncoding"
import { encodeAddressEthereum } from "./encoding/ethereum"
import { encodeAddressSs58 } from "./encoding/ss58"

describe("address encoding", () => {
  it("Base58", () => {
    const PUBLIC_KEY = [
      11, 243, 43, 159, 13, 176, 150, 114, 3, 143, 234, 54, 19, 155, 24, 249, 138, 95, 1, 73, 239,
      76, 224, 51, 46, 68, 185, 167, 126, 131, 194, 45,
    ]
    const ADDRESS = "oeYf6KAJkLYhBuR8CiGc6L4D4Xtfepr85fuDgA9kq96"

    const publicKey = new Uint8Array(PUBLIC_KEY)
    const address = encodeAddressBase58(publicKey)

    expect(address).toEqual(ADDRESS)
  })

  it("Ethereum", () => {
    const PUBLIC_KEY = [
      4, 131, 24, 83, 91, 84, 16, 93, 74, 122, 174, 96, 192, 143, 196, 95, 150, 135, 24, 27, 79,
      223, 198, 37, 189, 26, 117, 63, 167, 57, 127, 237, 117, 53, 71, 241, 28, 168, 105, 102, 70,
      242, 243, 172, 176, 142, 49, 1, 106, 250, 194, 62, 99, 12, 93, 17, 245, 159, 97, 254, 245,
      123, 13, 42, 165,
    ]
    const ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

    const publicKey = new Uint8Array(PUBLIC_KEY)
    const address = encodeAddressEthereum(publicKey)

    expect(address).toEqual(ADDRESS)
  })

  it("SS58 from ecdsa", () => {
    const PUBLIC_KEY = [
      136, 220, 52, 23, 213, 5, 142, 196, 180, 80, 62, 12, 18, 234, 26, 10, 137, 190, 32, 15, 233,
      137, 34, 66, 61, 67, 52, 1, 79, 166, 176, 238,
    ]
    const ADDRESS = "5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu"

    const publicKey = new Uint8Array(PUBLIC_KEY)
    const address = encodeAddressSs58(publicKey)

    expect(address).toEqual(ADDRESS)
  })

  it("SS58 from ed25519", () => {
    const PUBLIC_KEY = [
      212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44, 133, 88, 133,
      76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
    ]
    const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

    const publicKey = new Uint8Array(PUBLIC_KEY)
    const address = encodeAddressSs58(publicKey)

    expect(address).toEqual(ADDRESS)
  })

  it("SS58 from sr25519", () => {
    const PUBLIC_KEY = [
      212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44, 133, 88, 133,
      76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
    ]
    const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

    const publicKey = new Uint8Array(PUBLIC_KEY)
    const address = encodeAddressSs58(publicKey)

    expect(address).toEqual(ADDRESS)
  })

  it("encode ss58 address from address", () => {
    const GENERIC = "5CcU6DRpocLUWYJHuNLjB4gGyHJrkWuruQD5XFbRYffCfSAP"
    const POLKADOT = "1YmEYgtfPbwx5Jos1PjKDWRpuJWSpTzytwZgYan6kgiquNS"
    const KUSAMA = "D85kXmhRyMQGC7jg59n523H7sb6ZBj3Mn3puusP2TshQLGx"

    expect(encodeAddressSs58(GENERIC)).toEqual(GENERIC)
    expect(encodeAddressSs58(GENERIC, 42)).toEqual(GENERIC)
    expect(encodeAddressSs58(GENERIC, 0)).toEqual(POLKADOT)
    expect(encodeAddressSs58(GENERIC, 2)).toEqual(KUSAMA)
    expect(encodeAddressSs58(POLKADOT, 2)).toEqual(KUSAMA)
  })
})

describe("detect address encoding", () => {
  it("Ethereum", () => {
    const ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    expect(detectAddressEncoding(ADDRESS)).toEqual("ethereum")
  })

  it("Base58", () => {
    const ADDRESS = "oeYf6KAJkLYhBuR8CiGc6L4D4Xtfepr85fuDgA9kq96"
    expect(detectAddressEncoding(ADDRESS)).toEqual("base58")
  })

  it("SS58", () => {
    const ADDRESS = "5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu"
    expect(detectAddressEncoding(ADDRESS)).toEqual("ss58")
  })
})
