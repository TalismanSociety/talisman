// import { base58, ed25519 } from "@talismn/crypto"

// import { requestStore } from "../../libs/requests/store"
// import { Port } from "../../types/base"
// import { urlToDomain } from "../../util/urlToDomain"
// import { keyringStore } from "../keyring/store"
// import { withSecretKey } from "../keyring/withSecretKey"
// import { AuthSolanaSignInRequest, AuthSolanaSignInResponse } from "../sitesAuthorised/types"
// import { SOLANA_WALLET_CHAINS, SOLANA_WALLET_STANDARD_FEATURES } from "./constants"
// import { RequestSolanaSignIn, ResponseSolanaSignIn } from "./types.tabs"

// export const requestSignIn = async ({ input }: RequestSolanaSignIn, url: string, port: Port) => {
//   const resDomain = urlToDomain(url)
//   const domain = resDomain.unwrap()

//   const response = await requestStore.createRequest<Omit<AuthSolanaSignInRequest, "id">>(
//     {
//       // id will be set automatically by requestStore
//       type: "auth-sol-signIn",
//       url,
//       input,
//     },
//     port,
//   )

//   throw new Error(
//     "requestSignIn should not return a response directly, it should be handled by the requestStore",
//   )

//   console.log("requestSignIn response", { response, url })
//   if (!response) throw new Error("Sign-in request failed") // TODO check if this can happen ?

//   const { address, message } = response as AuthSolanaSignInResponse

//   const account = await keyringStore.getAccount(address)
//   if (!account) throw new Error("Account not found")

//   const signedMessage = new TextEncoder().encode(message)

//   const signResult = await withSecretKey(address, async (secretKey) => {
//     // Sign the message
//     return ed25519.sign(signedMessage, secretKey)
//   })

//   const signature = signResult.unwrap()

//   console.log("requestSignIn", { url, port, domain, address, message })

//   const output: ResponseSolanaSignIn = {
//     account: {
//       address: account.address,
//       label: account.name,
//       chains: SOLANA_WALLET_CHAINS, // TODO extract from chaindata
//       features: SOLANA_WALLET_STANDARD_FEATURES,
//       // TODO icon: TODO
//     },
//     signature: base58.encode(signature),
//     signedMessage: base58.encode(signedMessage),
//     signatureType: "ed25519",
//   }

//   return output
// }
