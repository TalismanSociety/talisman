import { Blake2b as NosimdBlake2b, Xxhash as NosimdXxhash } from "./nosimd"

const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
const expectedTestDataHashes = {
  blake2_64: "b4c0d262a419d0c3",
  blake2_128: "6e920859d4dc94e6f701ae0b313094ac",
  blake2_256: "e283ce217acedb1b0f71fc5ebff647a1a17a2492a6d2f34fb76b994a23ca8931",
  blake2_512:
    "b942c381affddcd41d125a09e5f8c7189cb5daa32f6cc67d763054f5221360fe4efde375c6853365bac58f61ed2a2e5f55248a5c4934bacf730bbe85e72bc8e6",
  twox128: "d8849f717d1abec659326d69cec6c71d",
  twox256: "d8849f717d1abec659326d69cec6c71dc33f0fb7207bfce38683b1a9a023a655",
  twox64: "d8849f717d1abec6",
}

describe("hashers", () => {
  test("nosimd variants have expected outputs", () => {
    const { nosimd } = getHashers()

    Object.values(nosimd).forEach((hasher) => hasher.update(testData))

    expect(u8aToHex(nosimd.blake2_64.digest())).toEqual(expectedTestDataHashes.blake2_64)
    expect(u8aToHex(nosimd.blake2_128.digest())).toEqual(expectedTestDataHashes.blake2_128)
    expect(u8aToHex(nosimd.blake2_256.digest())).toEqual(expectedTestDataHashes.blake2_256)
    expect(u8aToHex(nosimd.blake2_512.digest())).toEqual(expectedTestDataHashes.blake2_512)
    expect(u8aToHex(nosimd.twox128.digest())).toEqual(expectedTestDataHashes.twox128)
    expect(u8aToHex(nosimd.twox256.digest())).toEqual(expectedTestDataHashes.twox256)
    expect(u8aToHex(nosimd.twox64.digest())).toEqual(expectedTestDataHashes.twox64)
  })

  test("nosimd digestInto correctly mutates the given Uint8Array", () => {
    const { nosimd } = getHashers()

    Object.values(nosimd).forEach((hasher) => hasher.update(testData))

    const digests = {
      blake2_64: new Uint8Array(64 / 8),
      blake2_128: new Uint8Array(128 / 8),
      blake2_256: new Uint8Array(256 / 8),
      blake2_512: new Uint8Array(512 / 8),
      twox128: new Uint8Array(128 / 8),
      twox256: new Uint8Array(256 / 8),
      twox64: new Uint8Array(64 / 8),
    }

    nosimd.blake2_64.digestInto(digests.blake2_64)
    nosimd.blake2_128.digestInto(digests.blake2_128)
    nosimd.blake2_256.digestInto(digests.blake2_256)
    nosimd.blake2_512.digestInto(digests.blake2_512)
    nosimd.twox128.digestInto(digests.twox128)
    nosimd.twox256.digestInto(digests.twox256)
    nosimd.twox64.digestInto(digests.twox64)

    expect(u8aToHex(digests.blake2_64)).toEqual(expectedTestDataHashes.blake2_64)
    expect(u8aToHex(digests.blake2_128)).toEqual(expectedTestDataHashes.blake2_128)
    expect(u8aToHex(digests.blake2_256)).toEqual(expectedTestDataHashes.blake2_256)
    expect(u8aToHex(digests.blake2_512)).toEqual(expectedTestDataHashes.blake2_512)
    expect(u8aToHex(digests.twox128)).toEqual(expectedTestDataHashes.twox128)
    expect(u8aToHex(digests.twox256)).toEqual(expectedTestDataHashes.twox256)
    expect(u8aToHex(digests.twox64)).toEqual(expectedTestDataHashes.twox64)
  })
})

const getHashers = () => ({
  nosimd: {
    blake2_64: new NosimdBlake2b(64 / 8),
    blake2_128: new NosimdBlake2b(128 / 8),
    blake2_256: new NosimdBlake2b(256 / 8),
    blake2_512: new NosimdBlake2b(512 / 8),
    twox128: new NosimdXxhash(128 / 64),
    twox256: new NosimdXxhash(256 / 64),
    twox64: new NosimdXxhash(64 / 64),
  },
})
const u8aToHex = (u8a: Uint8Array) => Buffer.from(u8a).toString("hex")
