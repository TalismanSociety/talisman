# Talisman Browser Extension

## Notes for reviewers

The extension ships one WebAssembly module: `assets/raptorq_bg-<hash>.wasm`. It is the unmodified `raptorq_bg.wasm` file from the [`raptorq`](https://www.npmjs.com/package/raptorq) npm package (version pinned in `apps/extension/package.json`), built from https://github.com/cberner/raptorq. The extension uses it to encode the animated QR codes that Polkadot Vault reads to sign transactions.

To verify it, compare the file with `raptorq_bg.wasm` in the npm package tarball of the same version.

For the reproducible Firefox build, see `FIREFOX_SOURCE_CODE_REVIEW.md` in the source archive.
