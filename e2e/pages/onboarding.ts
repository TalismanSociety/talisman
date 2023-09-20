import { Locator, Page, expect } from "@playwright/test";
import Common from "./common";

export default class Onboarding extends Common {
    readonly inputRecoveryPhrase: Locator
    readonly btnImportWallet: Locator
    readonly inputPassword: Locator
    readonly inputConfirmPassword: Locator
    readonly inputAccountName: Locator
    readonly ckbAcknowledge: Locator
    readonly btnContinue: Locator
    
    constructor(readonly page: Page) {
        super(page);
        this.inputRecoveryPhrase = page.locator('textarea[name=mnemonic]')
        this.btnImportWallet = page.locator('span.btn-content')
        this.inputPassword = page.locator('input[name=password]')
        this.inputConfirmPassword = page.locator('input[name=passwordConfirm]')
        this.inputAccountName = page.locator('input[name="name"]')
        this.ckbAcknowledge = page.getByRole('checkbox', { name: 'I acknowledge'})
        this.btnContinue = page.locator('button[type=submit]')
    }

    async createNewPolkadotWallet(password: string, accountName: string) {
        await this.inputPassword.fill(password)
        await this.inputConfirmPassword.fill(password)
        await this.btnContinue.click()
        await this.getByRole('button', 'I agree').click()
        await this.getByRole('button', 'New Polkadot Account').click()
        await this.inputAccountName.fill(accountName)
        await this.btnContinue.click()
        await this.ckbAcknowledge.click()
        await this.getByRole('button', 'Continue').click()
        await this.getByRole('alert').getByText('Account created').click()
        await this.getByRole('button', 'Enter Talisman').click()
        await this.getByRole('alert').getByText('Pin Talisman for easy access').click()
        await expect(this.getByRole('alert').getByText('Pin Talisman for easy access')).not.toBeVisible()
    }

    async importPolkadotWallet(password: string, seedPhrase: string, accountName: string) {
        await this.inputPassword.fill(password)
        await this.inputConfirmPassword.fill(password)
        await this.btnContinue.click()
        await this.getByRole('button', 'I agree').click()
        await this.getByRole('button', 'Import').click()
        await this.getByRole('button', 'Import via Recovery Phrase').click()
        await this.getByRole('button', 'Polkadot').click()
        await this.inputAccountName.fill(accountName)
        await this.inputRecoveryPhrase.fill(seedPhrase)
        await this.btnContinue.click()
        await this.getByRole('alert').getByText('Account imported').click()
        await this.getByRole('button', 'Enter Talisman').click()
        await this.getByRole('alert').getByText('Pin Talisman for easy access').click()
        await expect(this.getByRole('alert').getByText('Pin Talisman for easy access')).not.toBeVisible()
    }
}