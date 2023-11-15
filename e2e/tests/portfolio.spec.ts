import data from "../fixtures/data"
import test, { expect } from "../fixtures/setup"
import Utils from "../helpers/utils"
import Modal from "../pages/modal"

test.describe("Portfolio", async () => {
  test.beforeEach(async ({ page, onboarding, portfolio }) => {
    await test.step("create new wallet", async () => {
      await onboarding.page.getByTestId("get-started-button").click()
      // await onboarding.getByRole("button", "Get Started").click()
      await onboarding.importPolkadotWallet(data.password, data.seedPhrase, data.dotAccountName)
      await page.waitForURL("**/portfolio")
      expect(await portfolio.waitForNetworks()).not.toBeNull()
    })
  })

  test.afterEach(async ({ context }) => {
    await context.close()
  })

  test("Filter by Network", async ({ portfolio }) => {
    let index: number, network: string, networks: string[], networkIcon: string
    await test.step("select a network from drop down list and correct network is selected", async () => {
      await portfolio.ddlExpandNetwork.click()
      const networkCount = await portfolio.ddlNetwork.count()
      index = Utils.genRandomNumber(0, networkCount - 1)
      network = (await portfolio.ddlNetwork.nth(index).textContent()) as string
      await portfolio.ddlNetwork.nth(index).click()
      await expect(portfolio.ddlNetworkInput).toHaveAttribute("placeholder", network)
      networkIcon = (await portfolio.ddlNetworkIcon.getAttribute("data-id")) as string
    })
    await test.step("check network is filtered in the list", async () => {
      const networkIcons = await portfolio.assetIcon.all()
      expect(
        networkIcons.every(async (icon) => (await icon.getAttribute("data-id")) === networkIcon)
      ).toBeTruthy()
    })
    await test.step("enter a network in the search field and list items match/contain search value", async () => {
      await portfolio.ddlExpandNetwork.click()
      await portfolio.ddlNetworkInput.fill(network)
      networks = await portfolio.ddlNetwork.allTextContents()
      expect(networks.every((network) => network.includes(network))).toBeTruthy()
    })
    await test.step("select the first network from the list and correct network is selected", async () => {
      await portfolio.ddlNetwork.first().click()
      await expect(portfolio.ddlNetworkInput).toHaveAttribute("placeholder", networks[0])
    })
    await test.step("check network is filtered in the list", async () => {
      const networkIcons = await portfolio.assetIcon.all()
      expect(
        networkIcons.every(async (icon) => (await icon.getAttribute("data-id")) === networkIcon)
      ).toBeTruthy()
    })
  })

  test("Copy Address", async ({ page, portfolio, modal }) => {
    let network: string, address: string
    await test.step("click on an asset listed on Portfolio", async () => {
      await portfolio.assetList.first().click()
    })
    await test.step("click on copy address icon. select a Polkadot account and network", async () => {
      await portfolio.headerCopyAddress.click()
      await modal.listItem.getByText(data.dotAccountName).click()
      network = (await modal.listItem.nth(1).locator("div").first().textContent()) as string
      address = (await modal.listItem.nth(1).locator("div").last().textContent()) as string
      await modal.listItem.nth(1).click()
    })

    await test.step("check selected account, network and address", async () => {
      await modal.accountButton.getByText(data.dotAccountName).click()
      await modal.listItem.getByText(data.dotAccountName).click()
      await modal.networkButton.getByText(network).click()
      await modal.listItem.getByText(network + address).click()
      await expect(modal.network).toHaveText(network)
      await expect(modal.address).toHaveText(address)
    })
    await test.step("copy address and check copied address", async () => {
      await portfolio.getByRole("button", "Copy Address").click()
      await portfolio.getByRole("alert").getByText("Address Copied").waitFor()
      await portfolio.getByRole("alert").getByText("Address Copied").waitFor({ state: "detached" })
      const copiedAddress = await page.evaluate(async () => await navigator.clipboard.readText())
      const formatAddress = copiedAddress.slice(0, 5) + "…" + copiedAddress.slice(-5)
      expect(formatAddress).toBe(address)
    })
  })

  test("Copy Network Address", async ({ page, portfolio, modal }) => {
    let network: string, account: string, address: string
    await test.step("click on an asset listed on Portfolio", async () => {
      await portfolio.assetList.first().click()
    })
    await test.step("click on copy address icon of a listed network. select an account", async () => {
      network = (await portfolio.networkName.first().textContent()) as string
      await portfolio.networkCopyAddress.first().click()
      account = (await modal.listItem.first().textContent()) as string
      await modal.listItem.first().click()
    })
    await test.step("check selected account, network and address", async () => {
      await modal.accountButton.getByText(account).click()
      await modal.listItem.getByText(account).click()
      await expect(modal.network).toHaveText(network)
      address = (await modal.address.textContent()) as string
    })
    await test.step("copy address and check copied address", async () => {
      await portfolio.getByRole("button", "Copy Address").click()
      await portfolio.getByRole("alert").getByText("Address Copied").waitFor()
      const copiedAddress = await page.evaluate(async () => await navigator.clipboard.readText())
      const formatAddress = copiedAddress.slice(0, 5) + "…" + copiedAddress.slice(-5)
      expect(formatAddress).toBe(address)
    })
  })

  test("Search by token and network name", async ({ context, portfolio }) => {
    let modal: Modal, token: string, network: string
    await test.step("click on an asset listed on Portfolio", async () => {
      await portfolio.assetList.first().click()
    })
    await test.step("click send icon. wait for modal to open", async () => {
      const [modalPage] = await Promise.all([
        context.waitForEvent("page"),
        portfolio.headerSend.click(),
      ])
      modal = new Modal(modalPage)
    })
    await test.step("search by token", async () => {
      await modal.listItem.first().waitFor()
      const listCount = await modal.listItem.count()
      const index = Utils.genRandomNumber(0, listCount - 1)
      ;[token, network] = await modal.listItem
        .nth(index)
        .locator("div:not([class])")
        .allTextContents()
      await modal.inputSearch.fill(token)
      await modal.page.waitForTimeout(500)
      ;(await modal.listItem.all()).forEach(async (item) => {
        const texts = await item.locator("div:not([class])").allTextContents()
        expect(texts.some((text) => new RegExp(token, "i").test(text))).toBeTruthy()
      })
    })
    await test.step("search by network", async () => {
      await modal.inputSearch.clear()
      await modal.inputSearch.fill(network)
      await modal.page.waitForTimeout(500)
      ;(await modal.listItem.all()).forEach(async (item) => {
        const texts = await item.locator("div:not([class])").allTextContents()
        expect(texts.some((text) => new RegExp(network, "i").test(text))).toBeTruthy()
      })
    })
  })
})
