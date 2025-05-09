import { DOT_ACC_NAME, ETH_ACC_NAME } from "./constants"
import { test } from "./fixtures"

test("Import accounts & add new ones", async ({ addNewAccount, importAccount }) => {
  await importAccount({ type: "ethereum", name: ETH_ACC_NAME })
  await importAccount({ type: "polkadot", name: DOT_ACC_NAME })
  await addNewAccount({ type: "ethereum" })
  await addNewAccount({ type: "polkadot" })
})
