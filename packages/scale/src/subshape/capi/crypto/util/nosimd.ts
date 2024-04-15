import { blake2AsU8a, xxhashAsU8a } from "@polkadot/util-crypto"
import { Hasher } from "wat-the-crypto/types/common/hasher"

type XxHashBitLength = Parameters<typeof xxhashAsU8a>[1]
type Blake2bBitLength = Parameters<typeof blake2AsU8a>[1]

export class Xxhash implements Hasher {
  rounds: number
  input: Uint8Array = new Uint8Array()

  constructor(rounds: number) {
    this.rounds = rounds
  }

  update(input: Uint8Array): void {
    this.input = input
  }

  digest(): Uint8Array {
    return xxhashAsU8a(this.input, (this.rounds * 64) as XxHashBitLength)
  }
  digestInto(digest: Uint8Array): void {
    digest.set(this.digest())
  }
  dispose(): void {
    this.input = new Uint8Array()
  }
}

export class Blake2b implements Hasher {
  digestSize: number
  input: Uint8Array = new Uint8Array()

  // digestSize defaults to 64
  // https://github.com/paritytech/wat-the-crypto/blob/a96745c57f597b35fe1461d0e643a34ba5e7bd85/blake2b/blake2b.ts#L31
  constructor(digestSize = 64) {
    this.digestSize = digestSize
  }

  update(input: Uint8Array): void {
    this.input = input
  }

  digest(): Uint8Array {
    return blake2AsU8a(this.input, (this.digestSize * 8) as Blake2bBitLength)
  }
  digestInto(digest: Uint8Array): void {
    digest.set(this.digest())
  }
  dispose(): void {
    this.input = new Uint8Array()
  }
}
