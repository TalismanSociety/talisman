/**
 * A keyring blob in the storage format written by @talismn/keyring 2.0.4, as the extension and
 * the mobile app persist it. Every later version must load it unchanged.
 *
 * The secrets are encrypted under FIXTURE_PASSWORD with PBKDF2 reduced to 1 iteration, so only
 * tests that mock pbkdf2 the way Keyring.test.ts does can decrypt them. The external accounts
 * carry the shapes found in stored data: a ledger-polkadot account from before the curve field,
 * the fields the polkadot.js keyring migration can leave out, and fields the mobile app adds. The
 * "Orphaned ed25519" account points at a mnemonic that was removed.
 */
export const FIXTURE_PASSWORD = "fixture-password"

export const FIXTURE_MNEMONIC = "test test test test test test test test test test test junk"

export const FIXTURE_STORAGE = {
  passwordCheck:
    "p0NCfzlSa63rggjoLVfz4xI74OQLjpkuxQ9pXYzQRPk6TaaJ1geevgdMtAbuv6B2k4Kcn9QIMr6U4X6PjvIWGl0=",
  mnemonics: [
    {
      id: "2WY9hhzQea5zzPWKUNAnDsTJ1TAEfKqf7aHhjTCeae6M",
      name: "Primary",
      entropy: "8orhASWpUQG876sp10rj+dbCRb05WzDZEXUvFbduexUFxQfnsPClJr6FhIVNEJRH8vRfL6LCzUtC/BBp",
      confirmed: true,
      createdAt: 1793074391917,
    },
  ],
  accounts: [
    {
      type: "keypair",
      curve: "sr25519",
      name: "Derived sr25519",
      address: "5Gpg3hhPkyPRSwQc5EYprccoJ81fzEdUQqbtsY25RMezaPjb",
      secretKey:
        "Gx0Jay6A7HUPAIUyLbNPvpQnI0p8GEA8TgvgASPg6a7+HNLWCaWasFbcJ2A529WPkPyMJgx2bvT/y3ADZ+5PRshw0TYaMrCz04dWruSOrwJukaTPPNXLd1mqPcKVfytB8FqEKIIT2D2XjMPZ",
      mnemonicId: "2WY9hhzQea5zzPWKUNAnDsTJ1TAEfKqf7aHhjTCeae6M",
      derivationPath: "//0",
      createdAt: 1793074391971,
    },
    {
      type: "keypair",
      curve: "ethereum",
      name: "Derived ethereum",
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      secretKey:
        "mOOP5E/GZfqoFtohPg3AzmUthCXegwEoqWyRqrzta6lVfvs8E5lE0UPe1XXwfUUBX3JMEG9r6xQS1w1azxkSdDqhWZ/bIcbPC0XVtQ==",
      mnemonicId: "2WY9hhzQea5zzPWKUNAnDsTJ1TAEfKqf7aHhjTCeae6M",
      derivationPath: "m/44'/60'/0'/0/0",
      createdAt: 1793074392044,
    },
    {
      type: "keypair",
      curve: "ed25519",
      name: "Orphaned ed25519",
      address: "5FM25N8HGtacre9TnWQGRK32d1kUp1Gs6Dd7YiYpSPZLjmj6",
      secretKey:
        "uMekr+PsG2QHtQiQft9c5i5XWXGPg5EBcsVAVU0w6opbHeRHdWh3qpMYVpajIYitfmMjDDS51h3leTpxrU7RHvfYMvteQGUYI5ZJvA==",
      mnemonicId: "GSfxc7X8q8VcdVH9VXycCqLShFzbYXLAq6xwyeppoKpq",
      derivationPath: "",
      createdAt: 1793074392053,
    },
    {
      type: "keypair",
      curve: "ecdsa",
      name: "Imported ecdsa",
      address: "5DmrxRHDTLW45AsWXGuTjXRNpipn9pA8hbBb4ZVEExgs2SiB",
      secretKey:
        "1hFQ6CkKVXlpRyN76RNY/DtstlUo5+2WeC92TxM/CPdSDJ9xFT4N0Vh76GkbfUhrjVHvrhGDYnXo6HHlpd6vhkLACirTKdJTMovkuw==",
      createdAt: 1793074392056,
    },
    {
      type: "ledger-polkadot",
      name: "Ledger before the curve field",
      address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      app: "Polkadot",
      accountIndex: 0,
      addressOffset: 0,
      createdAt: 1793074392100,
    },
    {
      type: "ledger-polkadot",
      curve: "ethereum",
      name: "Ledger with a derivation path",
      address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      app: "Polkadot",
      accountIndex: 1,
      addressOffset: 0,
      derivationPath: "m/44'/60'/1'/0/0",
      createdAt: 1793074392101,
    },
    {
      type: "ledger-polkadot",
      curve: "ed25519",
      name: "Migrated legacy Ledger",
      address: "5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL",
      app: "Polkadot",
      addressOffset: 0,
      genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
      createdAt: 1793074392102,
    },
    {
      type: "ledger-ethereum",
      name: "Migrated Ledger without a path",
      address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      createdAt: 1793074392103,
    },
    {
      type: "ledger-solana",
      name: "Ledger Solana",
      address: "GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW",
      derivationPath: "m/44'/501'/0'/0'",
      createdAt: 1793074392104,
    },
    {
      type: "signet",
      name: "Migrated Signet without a url",
      address: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
      createdAt: 1793074392105,
    },
    {
      type: "polkadot-vault",
      name: "Vault root",
      address: "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy",
      genesisHash: null,
      createdAt: 1793074392106,
    },
    {
      type: "watch-only",
      name: "Watched Solana",
      address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      isPortfolio: true,
      walletType: "solana",
      curve: "solana",
      createdAt: 1793074392107,
    },
    {
      type: "watch-only",
      name: "Watched Bitcoin",
      address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      isPortfolio: false,
      createdAt: 1793074392108,
    },
    {
      type: "contact",
      name: "Contact",
      address: "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw",
      genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
      createdAt: 1793074392109,
    },
  ],
}
