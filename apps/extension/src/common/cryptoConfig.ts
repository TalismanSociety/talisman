// Initialize @polkadot/util-crypto WASM module
// This must be imported early to ensure crypto is ready before any cryptographic operations
// Some frontend features like JSON account import use @polkadot/keyring which requires WASM

import { cryptoWaitReady } from "@polkadot/util-crypto"
import { log } from "extension-shared"

cryptoWaitReady().catch((err) => {
  log.error("Failed to initialize crypto WASM", err)
})
