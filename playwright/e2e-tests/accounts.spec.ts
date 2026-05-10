import { test } from "./fixtures"

test("Import various account types", async ({
  addNewAccount,
  importAccount,
  addWatchedAccount,
  importPrivateKey,
}) => {
  await importAccount({ type: "ethereum" })
  await importAccount({ type: "substrate" })
  await importAccount({ type: "solana" })
  await addNewAccount({ type: "ethereum" })
  await addNewAccount({ type: "substrate" })
  await addNewAccount({ type: "solana" })
  await addWatchedAccount({
    type: "substrate",
    address: "5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z",
    name: "Substrate Watched",
  })
  await addWatchedAccount({ type: "ethereum", address: "vitalik.eth", name: "Vitalik Watched" })
  await addWatchedAccount({
    type: "solana",
    address: "5xJvx7YrqCqgyzxx4PQXt1AVbxioUsGABf2zevmYC8UL",
    name: "Solana Watched",
  })
  await importPrivateKey({
    type: "ethereum",
    privateKey: "a7532a2d81f249c1018fcf6de4d00591e17d3d99bbc7f47af7720db72f61372f",
  })
  await importPrivateKey({
    type: "solana",
    privateKey:
      "5ULDg64KAnVpPh4ganq476Zv2iybdT3JT2HBsaUoQuJqRUffkd845oWNzcKQU1QhqZqT6Z4jCDerrV9mbpShwnNK",
  })
})
