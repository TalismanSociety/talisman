import type { AddressInfo } from "node:net"

import { expect, test } from "./fixtures"

// self-contained dapp page: content scripts only inject on http(s) pages
const DAPP_HTML = `<!DOCTYPE html>
<html>
  <body>
    <h1>VRF test dapp</h1>
    <script>
      window.talismanReady = new Promise((resolve) => {
        const check = () => {
          if (window.injectedWeb3?.talisman) resolve(true)
          else setTimeout(check, 100)
        }
        check()
      })
      window.connectTalisman = async () => {
        window.talisman = await window.injectedWeb3.talisman.enable("vrf e2e")
        const accounts = await window.talisman.accounts.get(true)
        return accounts
      }
      window.signVrf = async (payload) => await window.talisman.signer.signVrf(payload)
    </script>
  </body>
</html>`

const startDappServer = async () => {
  const { createServer } = await import("node:http")
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" })
    res.end(DAPP_HTML)
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const { port } = server.address() as AddressInfo
  return { server, url: `http://127.0.0.1:${port}/` }
}

type InjectedAccount = { address: string; type?: string }
type VrfSignResult = { id: number; signature: string }

/** the globals the dapp page's inline script defines (see DAPP_HTML) */
type DappWindow = Window & {
  talismanReady: Promise<boolean>
  connectTalisman: () => Promise<InjectedAccount[]>
  signVrf: (payload: { address: string; data: string }) => Promise<VrfSignResult>
  accountsPromise: Promise<InjectedAccount[]>
  signPromise: Promise<VrfSignResult>
}

test("signVrf returns a deterministic, verifiable sr25519 VRF signature", async ({
  importAccount,
  context,
}) => {
  const { server, url } = await startDappServer()
  try {
    const accountName = "VRF sr25519"
    await importAccount({ type: "substrate", name: accountName })

    const dapp = await context.newPage()
    await dapp.goto(url)
    await dapp.evaluate(() => (window as unknown as DappWindow).talismanReady)

    // connect: approve the connection popup
    const [connectPopup] = await Promise.all([
      context.waitForEvent("page"),
      dapp.evaluate(() => {
        const w = window as unknown as DappWindow
        w.accountsPromise = w.connectTalisman()
      }),
    ])
    // polkadot connect does not preselect accounts: toggle ours, then connect
    await connectPopup.getByText(accountName).click()
    await connectPopup.getByTestId("connection-connect-button").click()

    const accounts = await dapp.evaluate(() => (window as unknown as DappWindow).accountsPromise)
    const srAccount = accounts.find((a) => a.type === "sr25519")
    expect(srAccount).toBeDefined()
    if (!srAccount) throw new Error("no sr25519 account")

    const data = `0x${Buffer.from("orbinum vrf e2e", "utf8").toString("hex")}`

    const signOnce = async () => {
      const [popup] = await Promise.all([
        context.waitForEvent("page"),
        dapp.evaluate(
          ({ address, data }) => {
            const w = window as unknown as DappWindow
            w.signPromise = w.signVrf({ address, data })
          },
          { address: srAccount.address, data }
        ),
      ])
      await expect(popup.getByText("VRF Signature Request")).toBeVisible()
      await popup.getByRole("button", { name: "Approve" }).click()
      const result = await dapp.evaluate(() => (window as unknown as DappWindow).signPromise)
      return result.signature
    }

    const sig1 = await signOnce()
    const sig2 = await signOnce()

    // output(32) || proof(64), hex encoded
    expect(sig1).toMatch(/^0x[0-9a-f]{192}$/)
    // deterministic VRF output, randomized proof — cryptographic validity of the output
    // and proof is covered by the wasm-schnorrkel parity vectors in @talismn/crypto
    expect(sig1.slice(0, 66)).toBe(sig2.slice(0, 66))
    expect(sig1).not.toBe(sig2)
  } finally {
    server.close()
  }
})
