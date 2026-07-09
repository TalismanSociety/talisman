# Vendored `@polkadot-api/tx-utils`

> ⚠️ **Temporary.** This folder is a vendored, lightly-patched copy of
> [`@polkadot-api/tx-utils`](https://www.npmjs.com/package/@polkadot-api/tx-utils). It exists only
> until upstream supports the signed extensions we need (custom / chain-specific signed extensions).
> Once upstream ships that, delete this folder and go back to depending on the published package.

## Provenance

Verbatim copy of the upstream **TypeScript source** at version **0.3.4**:
[`polkadot-api/polkadot-api@7492222a15cd`](https://github.com/polkadot-api/polkadot-api/tree/7492222a15cd/packages/tx-utils/src)
(the `polkadot-api@2.1.8` release commit, which published `tx-utils@0.3.4`).

The folder is excluded from Biome (formatting, linting and import sorting — see `biome.jsonc`
overrides) so files stay byte-close to upstream and can be diffed directly:

```sh
# fetch the pristine upstream source and diff — only the [talisman] hunks below should show up
git clone --depth 1 --no-checkout https://github.com/polkadot-api/polkadot-api /tmp/papi
git -C /tmp/papi fetch origin 7492222a15cd && git -C /tmp/papi checkout 7492222a15cd -- packages/tx-utils/src
diff -r /tmp/papi/packages/tx-utils/src packages/sapi/src/vendor/tx-utils
```

## Why it exists

We build extrinsics from a polkadot-js `SignerPayloadJSON` (`getPjsTxHelper` for signing,
`getTxHelper` for decoding a payload for display). Upstream `tx-utils` throws on signed extensions it
doesn't know about, which breaks chains that add their own — e.g. Avail's `CheckAppId`, plus any
future `Option`-typed signed extension. Our copy adds a generic escape hatch: the caller can provide
encoders for chain-specific signed extensions, and unknown `Option`-typed ones encode as `None`
instead of throwing.

```ts
const customSignedExtensions: CustomSignedExtensions = {
  CheckAppId: (payload) => signedExtension(compactNumber.enc(Number(payload.appId ?? 0)), empty),
}
const { callData, extra, additionalSigned } = getPjsTxHelper(metadataRpc, customSignedExtensions)(payload)
```

Handlers are only invoked when the chain's metadata actually declares the identifier, are consulted
only for identifiers the library doesn't handle built-in (no overriding of `CheckNonce` & co), and
take precedence over the `Option`→`None` fallback. They also receive the chain's decoded metadata
(`UnifiedMetadata`) as a second argument, for extensions whose encoding depends on it. Talisman's handlers live in
`packages/sapi/src/customSignedExtensions.ts` — nothing chain-specific lives in this folder.

This was previously carried as a `pnpm` patch (`patches/@polkadot-api__tx-utils@*.patch`). A patch
against the compiled `dist/` is opaque and re-breaks on every version bump, so we vendor the source
instead.

## Changes vs upstream

Behavioural — every hunk is tagged with a `// [talisman]` comment:

- `types.ts`: adds the `CustomSignedExtensions` type —
  `Record<identifier, (payload, metadata) => SignedExtension>`, where the payload is typed
  `SignerPayloadJSON & Record<string, unknown>` so handlers can read nonstandard payload fields
  (e.g. Avail's `appId`) without polluting `SignerPayloadJSON` itself, and `metadata` is the chain's
  decoded `UnifiedMetadata`.
- `pjs-tx-helper.ts`: `getPjsTxHelper` accepts an optional `customSignedExtensions` second argument
  and threads it (plus the payload) into `getSignedExtensionParts`.
- `new-helper.ts`: `getTxHelper` accepts the same as an optional third argument.
- `signed-extensions/get-signed-extension-parts.ts` and `new-helper.ts`: after the built-in switch,
  dispatch to the matching custom handler if one is provided; otherwise encode `None` for unknown
  `Option`-typed signed extensions instead of throwing.

Mechanical (also tagged):

- `"@/types"` (upstream's tsconfig path alias) is rewritten as a relative import in
  `signed-extensions/get-signed-extension-parts.ts` and `signed-extensions/user/CheckMortality.ts` —
  the alias can't be resolved when this package is consumed as source via the `@talismn/source`
  export condition.

Note for an eventual upstream PR: `index.ts` should additionally export `signedExtension`, `empty`,
`SignedExtension` and `CustomSignedExtensions` so package consumers can build handlers; we deep-import
them instead to keep `index.ts` byte-identical to upstream.

## Re-syncing with upstream

Diff against the new upstream version's `packages/tx-utils/src` (see the command above, with the new
release commit), port upstream changes verbatim, then re-apply the `// [talisman]` hunks. Keep the
byte-for-byte encoding identical — this is the substrate signing path and any divergence produces
invalid signatures. `signPjsPayload.spec.ts` (pjs parity fixtures) and `Extension.spec.ts`
(sign + verify round-trip) must stay green.

External dependencies (`@polkadot-api/{substrate-bindings,metadata-builders,utils,merkleize-metadata,signers-common}`)
are still the published packages; only `tx-utils` itself is vendored.
