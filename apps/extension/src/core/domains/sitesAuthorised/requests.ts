import { DEFAULT_ETH_CHAIN_ID } from "@common/constants"
import { assert } from "@polkadot/util"
import { base58 } from "@talismn/crypto"
import { getTalismanOrbDataUrl } from "@talismn/orb"
import { serializeOffchainMessage } from "@talismn/solana"
import { requestStore } from "../../libs/requests/store"
import type { KnownRequestIdOnly } from "../../libs/requests/types"
import type { Port } from "../../types/base"
import { urlToDomain } from "../../util/urlToDomain"
import { SOLANA_WALLET_CHAINS, SOLANA_WALLET_STANDARD_FEATURES } from "../solana/constants"
import type { RequestSolanaSignIn, ResponseSolanaSignIn } from "../solana/types.tabs"
import sitesAuthorisedStore from "./store"
import type { AuthorizedSite, AuthSolanaSignInRequest, RequestAuthorizeTab } from "./types"

export const ERROR_DUPLICATE_AUTH_REQUEST_MESSAGE =
  "Pending authorisation request already exists for this site. Please accept or reject the request."

class AuthError extends Error {}
export const requestAuthoriseSite = async (
  url: string,
  request: RequestAuthorizeTab,
  port: Port
) => {
  const { err, val: domain } = urlToDomain(url)
  if (err) throw new AuthError(domain)

  // Do not enqueue duplicate authorization requests.
  const isDuplicate = requestStore
    .getAllRequests("auth")
    .some((req) => req.idStr === domain && req.request.provider === request.provider)

  if (isDuplicate) {
    throw new AuthError(ERROR_DUPLICATE_AUTH_REQUEST_MESSAGE)
  }

  return requestStore
    .createRequest(
      {
        url,
        idStr: domain,
        request,
        type: "auth",
      },
      port
    )
    .then(async (response) => {
      const { addresses = [] } = response

      const { origin, provider } = request

      // we have already validated the url here, so no need to try/catch
      const siteAuth = (await sitesAuthorisedStore.getSiteFromUrl(url)) ?? ({} as AuthorizedSite)

      siteAuth.id = domain
      siteAuth.origin = origin
      siteAuth.url = url

      switch (provider) {
        case "polkadot": {
          siteAuth.addresses = addresses
          break
        }
        case "ethereum": {
          siteAuth.ethAddresses = addresses

          // set a default value for ethChainId only if empty
          // some sites switch the network before requesting auth, ex nova.arbiscan.io
          if (!siteAuth.ethChainId) siteAuth.ethChainId = DEFAULT_ETH_CHAIN_ID
          break
        }
        case "solana": {
          siteAuth.solAddresses = addresses
          break
        }
      }

      await sitesAuthorisedStore.set({
        [domain]: siteAuth,
      })
    })
}

export const ignoreRequest = ({ id }: KnownRequestIdOnly<"auth">) => {
  const request = requestStore.getRequest(id)
  assert(request, `Sites Auth Request with id ${id} doesn't exist`)
  requestStore.deleteRequest(id)
  return true
}

export const requestSolanaSignIn = async (
  { input }: RequestSolanaSignIn,
  url: string,
  port: Port
) => {
  const { err, val: domain } = urlToDomain(url)
  if (err) throw new AuthError(domain)

  // Do not enqueue duplicate authorization requests.
  const isDuplicate = requestStore.getAllRequests("auth-sol-signIn").some((req) => req.url === url)

  if (isDuplicate) throw new AuthError(ERROR_DUPLICATE_AUTH_REQUEST_MESSAGE)

  const { account, message, signature } = await requestStore.createRequest<
    Omit<AuthSolanaSignInRequest, "id">
  >(
    {
      // id will be set automatically by requestStore
      type: "auth-sol-signIn",
      url,
      input,
    },
    port
  )

  const siteAuth = (await sitesAuthorisedStore.getSiteFromUrl(url)) ?? ({} as AuthorizedSite)
  siteAuth.id = domain
  siteAuth.origin = ""
  siteAuth.url = url
  siteAuth.solAddresses = [account.address]

  await sitesAuthorisedStore.set({
    [domain]: siteAuth,
  })

  const messageBytes = new TextEncoder().encode(message)
  // hardware devices sign the off-chain message envelope, not the raw SIWS text
  const signedMessage =
    account.type === "ledger-solana"
      ? (serializeOffchainMessage(messageBytes) ?? messageBytes)
      : messageBytes

  const output: ResponseSolanaSignIn = {
    account: {
      address: account.address,
      label: account.name,
      chains: SOLANA_WALLET_CHAINS, // TODO extract from chaindata
      features: SOLANA_WALLET_STANDARD_FEATURES,
      icon: getTalismanOrbDataUrl(account.address),
    },
    signature,
    signedMessage: base58.encode(signedMessage),
    signatureType: "ed25519",
  }

  return output
}
