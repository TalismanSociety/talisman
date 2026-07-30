# @talismn/substrate-vrf

sr25519 VRF signing and verification in the origin-bound `substrate-vrf` context namespace — the
scheme behind Talisman's injected `signer.signVrf`.

MIT-licensed with a single dependency ([`@scure/sr25519`](https://github.com/paulmillr/scure-sr25519),
MIT). The namespace is wallet-neutral on purpose, so other wallets can adopt it the way `<Bytes>`
wrapping is shared for `signRaw`.

```
npm install @talismn/substrate-vrf
```

## Why a VRF

A VRF signature is `output(32) || proof(64)`: the output is **deterministic** per
`(secretKey, effective context, message)` — unlike a regular sr25519 signature, whose nonce is
random — and the proof lets anyone holding the public key check the output is genuine. That
determinism is what makes it usable for deriving stable per-dapp secrets and identities from a
wallet account, without ever exposing the account's keys.

## Dapp usage

Request a signature through the injected extension, then verify it with your own origin:

```ts
import { sr25519VerifyVrf } from "@talismn/substrate-vrf"

const signer = injected.signer
if (typeof signer.signVrf !== "function") throw new Error("wallet does not support signVrf")

// data (and the optional context) are 0x-prefixed hex
const { signature } = await signer.signVrf({ address, data, context })

// publicKey = the account's 32-byte sr25519 public key; hexToBytes = any hex decoder
const valid = sr25519VerifyVrf(hexToBytes(publicKey), hexToBytes(data), hexToBytes(signature), {
  origin: location.origin,
  context: hexToBytes(context),
})
```

Every output is bound to the requesting site's web origin (`scheme://host`): no other site can
obtain it, and a dapp served from several origins (including http vs https on the same host)
derives a different value on each — pin a canonical origin for anything long-lived.

`context` is the dapp's own domain separator within its origin: different contexts derive
independent outputs, so use one context per purpose (e.g. one per derived identity).

## Wallet usage

```ts
import { sr25519SignVrf } from "@talismn/substrate-vrf"

// origin = the requesting site's web origin (`scheme://host`), never caller-supplied
const signature = sr25519SignVrf(secretKey, message, { origin, context })
```

## The `substrate-vrf` namespace

The wallet never signs over the caller's raw context. The effective schnorrkel signing context is
the frame

```
"substrate-vrf" || u32_le(origin.len) || utf8(origin) || u32_le(context.len) || context
```

built by `substrateVrfContext(origin, context)`, and schnorrkel's `extra` is always empty.

- The constant tag confines everything the wallet signs for external callers to one namespace: a
  caller-chosen context can never reproduce another schnorrkel protocol's transcript, so the
  wallet cannot be used as a VRF oracle against other protocols.
- `origin` binds the output to the requesting site. Its length prefix is what makes
  `(origin, context)` injective — without it, a caller could pick a `context` that reconstructs
  another origin's frame.
- `extra` is not exposed: it changes the proof but never the output, so a caller using it as a
  domain separator would silently derive one identity where it expects several.

**The layout is frozen.** Outputs are deterministic per effective context, so any change rotates
every identity ever derived through the namespace. A revision must be a new opt-in tag, never a
replacement.

## Interoperability

Signatures are plain schnorrkel `vrf_sign_extra` signatures. Any schnorrkel implementation, in any
language, can produce or verify them: use `substrateVrfContext(origin, context)` (or rebuild the
frame from the layout above) as the signing context, with empty `extra`. The underlying primitives
are byte-compatible with polkadot-js `sr25519VrfSign` / `sr25519VrfVerify`.

## API

- `sr25519SignVrf(secretKey, message, { origin, context? })` → `Uint8Array` — 96-byte
  `output || proof` signature in the namespace
- `sr25519VerifyVrf(publicKey, message, signature, { origin, context? })` → `boolean` — malformed
  input returns `false`, never throws
- `substrateVrfContext(origin, context?)` → `Uint8Array` — the effective signing context, for
  re-implementers and non-JS verifiers
- `SubstrateVrfNamespace` — `{ origin: string; context?: Uint8Array }`
