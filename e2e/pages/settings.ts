import { Locator, Page, expect } from "@playwright/test";
import Common from "./common";

export default class Settings extends Common {
    readonly inputPassword: Locator
    readonly btnViewPhrase: Locator
    readonly textPhrase: Locator
    readonly btnDontRemind: Locator
    readonly btnToggle: Locator
    readonly iconClosePopup: Locator
    readonly textAccountCount: Locator
    readonly inputName: Locator
    readonly inputAddress: Locator
    readonly inputOldPwd: Locator
    readonly inputNewPwd: Locator
    readonly inputConfirmPwd: Locator
    readonly textError: Locator
    readonly btnEthNetworks: Locator
    readonly btnTestnets: Locator
    readonly inputRpc: Locator
    readonly inputChainId: Locator
    readonly inputTokenCoingeckoId: Locator
    readonly inputTokenSymbol: Locator
    readonly inputTokenDecimals: Locator
    readonly inputBlockExplorerUrl: Locator
    readonly imgDefaultNetwork: Locator
    readonly imgDefaultToken: Locator
    readonly btnDragRpc: Locator
    readonly btnDeleteRpc: Locator
    readonly ckbTestnet: Locator
    readonly btnReveal: Locator
    readonly ckbBackup: Locator

    constructor(readonly page: Page) {
        super(page)
        this.inputPassword = page.locator('input[name="password"]')
        this.btnViewPhrase = page.locator('button[type="submit"]')
        this.textPhrase = page.locator('span.bg-black-tertiary > span:not([class])')
        this.btnDontRemind = page.locator('div:has-text("Don\'t remind me again") + label > div')
        this.btnToggle = page.locator('label > div')
        this.iconClosePopup = page.locator('header button')
        this.textAccountCount = page.locator('div.text-primary.mr-3')
        this.inputName = page.locator('input[name="name"]')
        this.inputAddress = page.locator('input[name="searchAddress"]')
        this.inputOldPwd = page.locator('input[name="currentPw"]')
        this.inputNewPwd = page.locator('input[name="newPw"]')
        this.inputConfirmPwd = page.locator('input[name="newPwConfirm"]')
        this.textError = page.locator('div.text-alert-warn')
        this.btnEthNetworks = page.locator('button[role="button"]')
        this.btnTestnets = this.btnEthNetworks.locator('div.text-alert-warn >> text="Testnet"');
        this.inputRpc = page.locator('input[name^="rpcs"]')
        this.inputChainId = page.locator('input[name="id"]')
        this.inputTokenSymbol = page.locator('input[name="tokenSymbol"]')
        this.inputTokenCoingeckoId = page.locator('input[name="tokenCoingeckoId"]')
        this.inputTokenDecimals = page.locator('input[name="tokenDecimals"]')
        this.inputBlockExplorerUrl = page.locator('input[name="blockExplorerUrl"]')
        this.imgDefaultNetwork = page.locator('img[src$="unknown-network.svg"]')
        this.imgDefaultToken = page.locator('img[src$="unknown-token.svg"]')
        this.btnDragRpc = page.locator('//input[contains(@name, "rpcs")]/preceding-sibling::button')
        this.btnDeleteRpc = page.locator('//input[contains(@name, "rpcs")]/following-sibling::button')
        this.ckbTestnet = page.locator('input.form-checkbox ~ span')
        this.ckbBackup = page.getByRole('checkbox', { name: 'I have backed up'})
        this.btnReveal = page.locator('div:has-text("Copy to clipboard") + div button')
    }

    btnEthNetwork = (networkName: string) => this.page.locator(`//button[@role="button" and div[text()="${networkName}"]]`);

    async checkInputValues(inputs: { chainId: string, name: string, tokenSymbol: string, tokenDecimals: string, blockExplorerUrl: string, tokenCoingeckoId?: string }) {
        const { chainId, name, tokenSymbol, tokenDecimals, blockExplorerUrl, tokenCoingeckoId } = inputs;
        await expect(this.imgDefaultNetwork).not.toBeVisible();
        await expect(this.inputChainId).toHaveValue(chainId);
        await expect(this.inputName).toHaveValue(name);
        await expect(this.inputTokenSymbol).toHaveValue(tokenSymbol);
        await expect(this.inputTokenDecimals).toHaveValue(tokenDecimals);
        await expect(this.inputBlockExplorerUrl).toHaveValue(blockExplorerUrl);
        if (tokenCoingeckoId) {
            await expect(this.inputTokenCoingeckoId).toHaveValue(tokenCoingeckoId);
        }
    }

    async dragAndDropRpc(sourceLocator: Locator, targetLocator: Locator) {
        const source = await sourceLocator.boundingBox();
        const target = await targetLocator.boundingBox();
        if (source && target) {
            await this.page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
            await this.page.mouse.down();
            await this.page.mouse.move(target.x + target.width / 2, target.y + target.height / 2);
            await this.page.mouse.up();
        }
    }
}