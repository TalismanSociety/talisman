# Talisman Browser Extension

## Notes for reviewers

Talisman extension uses a library called `@polkadot/wasm-crypto-wasm` to provide cryptographic signing and verification functionality. The library contains compiled web assembly code, which will appear in the build files for this extension as something like:

```js
{
  e.exports = { bytes: "eNqkvQ2UXUd153vOuZ99u1t9...." }
}
```

You can see the source of this web assembly module here (https://github.com/polkadot-js/wasm/tree/8db05486c0cacb08b4a9cc37864b3dc6dcfd2c1f/packages/wasm-crypto-wasm) and build it to verify its authenticity using the following steps:

1. Install git, clang, nodejs, yarn and rustup

   - https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
   - https://clang.llvm.org/get_started.html (unless you're on windows you might already have this one installed by default)
   - https://nodejs.org/en/download/
   - https://yarnpkg.com/getting-started/install
   - https://rustup.rs/

2. In a **new terminal session**, clone the repo:  
   `git clone https://github.com/polkadot-js/wasm.git && cd wasm`

3. Install the rust build dependencies:  
   `bash ./scripts/install-build-deps.sh`

4. Install the node package dependencies:  
   `yarn`

5. Build the wasm:  
   `yarn build`

This should produce a file `packages/wasm-crypto-wasm/build/cjs/bytes.js` which contains the same string of WASM code as you can see in our extension package.
