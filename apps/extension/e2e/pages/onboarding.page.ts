import { Locator, Page, expect } from "@playwright/test";
import Common from "./common.page";

export default class Onboarding extends Common {
    readonly inputRecoveryPhrase: Locator
    readonly btnImportWallet: Locator
    readonly inputPassword: Locator
    readonly inputConfirmPassword: Locator
    readonly btnContinue: Locator
    
    constructor(readonly page: Page) {
        super(page);
        this.inputRecoveryPhrase = page.locator('textarea[name=mnemonic]')
        this.btnImportWallet = page.locator('span.btn-content')
        this.inputPassword = page.locator('input[name=password]')
        this.inputConfirmPassword = page.locator('input[name=passwordConfirm]')
        this.btnContinue = page.locator('button[type=submit]')
    }

    async createNewWallet(password: string) {
        await this.getByRole('button', 'New Wallet').click()
        await this.inputPassword.fill(password)
        await this.inputConfirmPassword.fill(password)
        await this.btnContinue.click()
        await this.getByRole('button', 'I agree').click()
        await this.getByRole('alert').getByText('Pin Talisman for easy access').click()
        await expect(this.getByRole('alert').getByText('Pin Talisman for easy access')).not.toBeVisible()
    }

    async importPolkadotWallet(seedPhrase: string, password: string) {
        await this.getByRole('button', 'Import a wallet').click()
        await this.getByRole('button', 'Polkadot wallet').click()
        await this.getByRole('button', 'Recovery Phrase').click()
        await this.inputRecoveryPhrase.fill(seedPhrase)
        await this.btnImportWallet.click()
        await this.inputPassword.fill(password)
        await this.inputConfirmPassword.fill(password);
        await this.btnContinue.click()
        await this.getByRole('button', 'I agree').click();
        await this.getByRole('alert').getByText('Pin Talisman for easy access').click()
        await expect(this.getByRole('alert').getByText('Pin Talisman for easy access')).not.toBeVisible()
    }
}