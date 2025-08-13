/*
Algorithm	Curve	    Blockchain Examples
=======================================================================================================================
ECDSA	    secp256k1	Bitcoin, Ethereum, Litecoin, Bitcoin Cash, Fantom, Celo
ECDSA	    secp256r1	Ethereum Classic, Fantom, Celo (optional)
EdDSA	    Ed25519	    Solana, Polkadot, Stellar, Tezos, Algorand, Cardano, Near Protocol, Cosmos
EdDSA	    Sr25519	    Polkadot
Schnorr	    secp256k1	Bitcoin (BIP 340, future), Ethereum (future), Stacks (future), Bitcoin Cash (future)
BLS	        BLS12-381	Ethereum 2.0 (Beacon Chain), Filecoin, Harmony, Near Protocol, Algorand, Zcash (Sapling), Celo
RSA	        Various	    NEM, Ripple (XRP), Monero (legacy systems, identity management)
DSA	        Various	    Bitcoin (legacy), Openchain
Schnorr	    secp521r1	Bitcoin (experimental/future), Ethereum 2.0 (potential use)
*/

// NOTE: Each item is a combination of algorithm (e.g. ECDSA) and curve (e.g. secp256k1)
export type KeypairCurve =
  | "ecdsa" // polkadot - ECDSA / secp256k1 - substrate derivation
  | "ed25519" // polkadot - EdDSA / Ed25519 - substrate derivation
  | "sr25519" // polkadot - EdDSA / Sr25519 - substrate derivation
  | "ethereum" // ethereum - ECDSA / secp256k1 - bip32 derivation
  | "bitcoin-ed25519" // bitcoin - X / Ed25519
  | "bitcoin-ecdsa" // bitcoin - ECDSA / secp256k1
  | "solana" // solana - EdDSA / Ed25519 - ed25519 derivation

// SS58: polkadot-sdk (stands for Substrate Standard 58, expects a network specific prefix)
// H160: ethereum
// Base58Check: p2pkh and p2sh addresses for bitcoin
// Bech32: bitcoin (segwit)
// Base58: solana
export type AddressEncoding =
  | "ss58" // polkadot
  | "ethereum" // ethereum (h160 + ethereum specific checksum)
  | "bech32m" // bitcoin (taproot, bc1p...)
  | "bech32" // bitcoin (native segwit, bc1...)
  | "base58check" // bitcoin (legacy p2pkh (original format, 1...) and p2sh (wrapped segwit, 3...))
  | "base58solana" // base58 with 32 bytes

export type Keypair = {
  type: KeypairCurve
  secretKey: Uint8Array
  publicKey: Uint8Array
  address: string
}

export type AccountPlatform = "ethereum" | "polkadot" | "bitcoin" | "solana"
