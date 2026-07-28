import type {
  DecryptPayload,
  DecryptResult,
  EncryptPayload,
  EncryptResult,
} from "@core/domains/encrypt/types"
import type { VrfSignPayload, VrfSignResult } from "@core/domains/signing/types"
import type { SendRequest } from "@core/types"
import type { SignerPayloadJSON, SignerPayloadRaw, SignerResult } from "@core/types/pjsInterop"

import type {
  Injected,
  InjectedAccount,
  InjectedAccounts,
  InjectedMetadata,
  InjectedMetadataKnown,
  MetadataDef,
  Unsubcall,
} from "./types"

// Minimal reimplementation of @polkadot/extension-base/page's Injected/Accounts/Metadata/Signer.
// Importing them drags PostMessageProvider and its dependency chain (@polkadot/util logger →
// bn.js, eventemitter3) into page.js — ~25% of the bundle — to power an `injected.provider`
// that is dead weight here: the background constructs RpcState with no providers, so
// `listProviders` always returns {} and `startProvider`/`send`/`subscribe` always throw.
// Dapp-facing message semantics below are identical to the upstream classes.
//
// All methods are arrow-function fields: upstream methods never touch `this` (module-level
// sendRequest), and dapps rely on it — @polkadot/extension-dapp's web3AccountsSubscribe
// destructures `subscribe` off `accounts` and calls it detached.

class Accounts implements InjectedAccounts {
  readonly #sendRequest: SendRequest

  constructor(sendRequest: SendRequest) {
    this.#sendRequest = sendRequest
  }

  public get = (anyType?: boolean): Promise<InjectedAccount[]> => {
    return this.#sendRequest("pub(accounts.list)", { anyType })
  }

  public subscribe = (cb: (accounts: InjectedAccount[]) => void | Promise<void>): Unsubcall => {
    let id: string | null = null

    this.#sendRequest("pub(accounts.subscribe)", null, cb)
      .then((subId) => {
        id = subId
      })
      // biome-ignore lint/suspicious/noConsole: mirrors upstream, no logger in page context
      .catch(console.error)

    return (): void => {
      // biome-ignore lint/suspicious/noConsole: mirrors upstream, no logger in page context
      if (id) this.#sendRequest("pub(accounts.unsubscribe)", { id }).catch(console.error)
    }
  }
}

class Metadata implements InjectedMetadata {
  readonly #sendRequest: SendRequest

  constructor(sendRequest: SendRequest) {
    this.#sendRequest = sendRequest
  }

  public get = (): Promise<InjectedMetadataKnown[]> => {
    return this.#sendRequest("pub(metadata.list)")
  }

  public provide = (definition: MetadataDef): Promise<boolean> => {
    return this.#sendRequest("pub(metadata.provide)", definition)
  }
}

// upstream Signer shares one id sequence across signPayload/signRaw - keep it module-level
let nextSignerId = 0

// Shown in the dapp's console when the deprecated message encrypt/decrypt endpoints are hit.
const ENCRYPT_DEPRECATION_WARNING =
  "[Talisman] Message encrypt/decrypt is deprecated and will be removed in a future release. " +
  "sr25519 message encryption was an experiment for the defunct SUMI chain, is not part of the " +
  "injected-web3 spec, and should not be relied upon."

export class TalismanSigner {
  readonly #sendRequest: SendRequest

  constructor(sendRequest: SendRequest) {
    this.#sendRequest = sendRequest
  }

  public signPayload = async (payload: SignerPayloadJSON): Promise<SignerResult> => {
    const id = ++nextSignerId
    const result = await this.#sendRequest("pub(extrinsic.sign)", payload)

    return { ...result, id }
  }

  public signRaw = async (payload: SignerPayloadRaw): Promise<SignerResult> => {
    const id = ++nextSignerId
    const result = await this.#sendRequest("pub(bytes.sign)", payload)

    return { ...result, id }
  }

  /**
   * Talisman-specific extension to the injected-web3 spec: sr25519 VRF signing.
   *
   * Returns 96 hex-encoded bytes, `output(32) || proof(64)`. The output is deterministic per
   * `(account, context, data)` — unlike `signRaw`, whose sr25519 signatures are randomized —
   * which is what makes it usable for key derivation. `context` is its only domain separator;
   * schnorrkel's `extra` is not accepted, as it changes the proof but not the output.
   *
   * Signing happens in the wallet-neutral, frozen `substrate-vrf` namespace, never over the raw
   * `context` — verify with `sr25519VerifyVrf` from `@talismn/crypto`.
   *
   * The output is not origin-bound: another site authorized for the same account can request the
   * same `(data, context)` and, if the user approves, receive the same output. Treat it as a
   * value the requesting site holds, not as a shared secret.
   *
   * Local sr25519 accounts only. Feature-detect with `typeof signer.signVrf === "function"`.
   */
  public signVrf = async (payload: VrfSignPayload): Promise<VrfSignResult> => {
    const id = ++nextSignerId
    const result = await this.#sendRequest("pub(vrf.sign)", payload)

    return { ...result, id }
  }

  /**
   * @deprecated Talisman's sr25519 message encryption was an experiment for the now-defunct SUMI
   * chain. It is not part of the injected-web3 spec and will be removed in a future release — do
   * not build on it.
   */
  public encryptMessage = async (payload: EncryptPayload): Promise<EncryptResult> => {
    // biome-ignore lint/suspicious/noConsole: dapp-facing deprecation notice, no logger in page context
    console.warn(ENCRYPT_DEPRECATION_WARNING)
    return await this.#sendRequest("pub(encrypt.encrypt)", payload)
  }

  /**
   * @deprecated Talisman's sr25519 message encryption was an experiment for the now-defunct SUMI
   * chain. It is not part of the injected-web3 spec and will be removed in a future release — do
   * not build on it.
   */
  public decryptMessage = async (payload: DecryptPayload): Promise<DecryptResult> => {
    // biome-ignore lint/suspicious/noConsole: dapp-facing deprecation notice, no logger in page context
    console.warn(ENCRYPT_DEPRECATION_WARNING)
    return await this.#sendRequest("pub(encrypt.decrypt)", payload)
  }
}

export default class TalismanInjected implements Injected {
  public readonly accounts: InjectedAccounts
  public readonly metadata: InjectedMetadata
  public readonly signer: TalismanSigner

  constructor(sendRequest: SendRequest) {
    this.accounts = new Accounts(sendRequest)
    this.metadata = new Metadata(sendRequest)
    this.signer = new TalismanSigner(sendRequest)
  }
}
