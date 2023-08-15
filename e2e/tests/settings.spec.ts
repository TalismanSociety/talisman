import test, { expect } from '../fixtures/setup';
import data from '../fixtures/data';
import Portal from '../pages/portal.page';

test.describe('Settings', () => {
    test.beforeEach(async ({onboarding}) => {
        await test.step('create new wallet', async () => {
            await onboarding.createNewWallet(data.password);
        });
        await test.step('go to Settings', async () => {
            await onboarding.getByRole('link', 'Settings').click();
        });
    });

    test.afterEach(async ({context}) => {
        await context.close();
    });

    test('Backup Wallet', async ({page, settings}) => {
        await test.step('check Change password button is disabled', async () => {
            await expect(settings.getByRole('button', 'Change password')).toBeDisabled();
        });
        await test.step('click Backup Wallet button. check View Recovery Phrase button is disabled', async () => {
            await settings.getByRole('button', 'Backup Wallet').click();
            await expect(settings.btnViewPhrase).toBeDisabled();
        });
        await test.step('enter password. check View Recovery Phrase button is enabled', async () => {
            await settings.inputPassword.fill(data.password);
            await settings.btnViewPhrase.click();
        });
        await test.step('check Copy to clipboard works', async () => {
            await settings.getByRole('button', 'Copy to clipboard').click();
            await expect(settings.getByRole('alert').getByText('Copied to clipboard')).toBeVisible();
            const copiedPhrase = (await page.evaluate(async () => await navigator.clipboard.readText())).split(' ');
            expect(copiedPhrase).toEqual(await settings.textPhrase.allTextContents())
        });
        await test.step('toggle on Dont remind me. check Change password button is enabled', async () => {
            await settings.btnToggle.click();
            await expect(settings.getByRole('button', 'Change password')).toBeEnabled();
            await settings.iconClosePopup.click();
        });
    });

    test('Trusted Sites', async ({settings, appPage}) => {
        await test.step('go to Trusted Sites. check web app is connected', async () => {
            await settings.getByRole('button', 'Trusted Sites').click();
            await settings.getByRole('button', 'Talisman').click();
            await expect(settings.textAccountCount).toHaveText('2');
            await expect(settings.getByText('My Polkadot Account')).toBeVisible();
            await expect(settings.getByText('My Ethereum Account')).toBeVisible();
        });
        await test.step('go to web app. check web app is connected', async () => {
            await appPage.goto('https://app.talisman.xyz');
            const portal = new Portal(appPage);
            await portal.allAccounts.click();
            await expect(appPage.getByText('My Polkadot Account')).toBeVisible();
            await expect(appPage.getByText('My Ethereum Account')).toBeVisible();
        });
        await test.step('disonnect all accounts in wallet. check web app is disconnected', async () => {
            await settings.getByRole('button', 'Disconnect All').click();
            await expect(settings.textAccountCount).toHaveText('0');
            await expect(appPage.getByText('My Polkadot Account')).not.toBeVisible();
            await expect(appPage.getByText('My Ethereum Account')).not.toBeVisible();
        });
        await test.step('connect all accounts in wallet. check web app is connected', async () => {
            await settings.getByRole('button', 'Connect All', true).click();
            await expect(settings.textAccountCount).toHaveText('2');
            await expect(appPage.getByText('My Polkadot Account')).toBeVisible();
            await expect(appPage.getByText('My Ethereum Account')).toBeVisible();
        });
        await test.step('forget site in wallet. check web app is disconnected and removed from wallet', 
        async () => {
            await settings.getByRole('button', 'Forget Site').click();
            await settings.getByRole('button', 'Cancel').click();
            await expect(settings.textAccountCount).toHaveText('2');
            await settings.getByRole('button', 'Forget Site').first().click();
            await settings.getByRole('button', 'Forget Site').last().click();
            await expect(settings.getByRole('button', 'Talisman')).not.toBeVisible();
            await expect(appPage.getByText('My Polkadot Account')).not.toBeVisible();
            await expect(appPage.getByText('My Ethereum Account')).not.toBeVisible();
        });
    });

    test('Address Book', async ({settings}) => {
        await test.step('go to Address Book. check Polkadot tab is selected by default', 
        async () => {
            await settings.getByRole('button', 'Address Book').click();
            await expect(settings.getByRole('button', 'Polkadot')).toBeDisabled();
        });
        await test.step('check Cancel button works', async () => {
            await settings.getByRole('button', 'Add a contact').click();
            await settings.getByRole('button', 'Cancel').click();
            await expect(settings.getByRole('button', 'Add a contact')).toBeVisible();
        });
        await test.step('check enable/disable status of Save button. add a Polkadot contact', 
        async () => {
            await settings.getByRole('button', 'Add a contact').click();
            await settings.inputName.fill(data.dotName);
            await expect(settings.getByRole('button', 'Save')).toBeDisabled();
            await settings.inputName.clear();
            await settings.inputAddress.fill(data.dotAddress);
            await expect(settings.getByRole('button', 'Save')).toBeDisabled();
            await settings.inputName.fill(data.dotName);
            await settings.getByRole('button', 'Save').click();
        });
        await test.step('check Polkadot contact is added', async () => {
            await expect(settings.getByText(data.dotName, 'span')).toBeVisible();
            await expect(settings.getByText(data.dotAddress.slice(0, 4) + '…' + data.dotAddress.slice(-4))).toBeVisible();       
        });        
        await test.step('click Ethereum tab. check tab is selected', async () => {
            await settings.getByRole('button', 'Ethereum').click();
            await expect(settings.getByRole('button', 'Ethereum')).toBeDisabled();
        });
        await test.step('check Cancel button works', async () => {
            await settings.getByRole('button', 'Add a contact').click();
            await settings.getByRole('button', 'Cancel').click();
            await expect(settings.getByRole('button', 'Add a contact')).toBeVisible();
        });
        await test.step('check enable/disable status of Save button. add an Ethereum contact', 
        async () => {
            await settings.getByRole('button', 'Add a contact').click();
            await settings.inputName.fill(data.ethName);
            await expect(settings.getByRole('button', 'Save')).toBeDisabled();
            await settings.inputName.clear();
            await settings.inputAddress.fill(data.ethAddress);
            await expect(settings.getByRole('button', 'Save')).toBeDisabled();
            await settings.inputName.fill(data.ethName);
            await settings.getByRole('button', 'Save').click();
        });
        await test.step('check Ethereum contact is added', async () => {
            await expect(settings.getByText(data.ethName, 'span')).toBeVisible();
            await expect(settings.getByText(data.ethAddress.slice(0, 4) + '…' + data.ethAddress.slice(-4))).toBeVisible();       
        });
    });

    test('Extension Options > enable/disable testnets', async ({settings}) => {
        await test.step('go to Manage Ethereum Networks. check testnet is disabled', 
        async () => {
            await settings.getByRole('button', 'Manage Ethereum Networks').click();
            await expect(settings.btnTestnets).not.toBeVisible();
            await settings.getByRole('button', 'Back').click();
        });
        await test.step('go to Extension Options. enable Testnets option', 
        async () => {
            await settings.getByRole('button', 'Extension Options').click();
            await settings.btnToggle.first().click();
            await settings.getByRole('button', 'Back').click();
        });
        await test.step('go to Manage Ethereum Networks. check testnet is enabled', 
        async () => {
            await settings.getByRole('button', 'Manage Ethereum Networks').click();
            await expect(settings.btnTestnets.first()).toBeVisible();
            await settings.getByRole('button', 'Back').click();
        });
        await test.step('go Extension Options. disable Testnets option', 
        async () => {
            await settings.getByRole('button', 'Extension Options').click();
            await settings.btnToggle.first().click();
            await settings.getByRole('button', 'Back').click();
        });
        await test.step('go to Manage Ethereum Networks. check testnet is disabled', 
        async () => {
            await settings.getByRole('button', 'Manage Ethereum Networks').click();
            await expect(settings.btnTestnets).not.toBeVisible();
            await settings.getByRole('button', 'Back').click();
        });
    });

    test('Ethereum Networks > enable/disable testnets', async ({settings}) => {
        let totalEthNetworks = 0, totalTestnets = 0, totalAllNetworks = 0;
        await test.step('go to Manage Ethereum Networks. check testnet is disabled', async () => {
            await settings.getByRole('button', 'Manage Ethereum Networks').click();
            await expect(settings.btnTestnets).not.toBeVisible();
            totalEthNetworks = await settings.btnEthNetworks.count();
        });
        await test.step('click Enable testnets. check testnet is enabled', async () => {
            await settings.getByRole('button', 'Enable testnets').click();
            await expect(settings.btnTestnets.first()).toBeVisible();
            totalTestnets = await settings.btnTestnets.count();
            totalAllNetworks = await settings.btnEthNetworks.count();
            expect(totalAllNetworks).toBe(totalEthNetworks + totalTestnets);
        });
        await test.step('click Enable testnets. check testnet is disabled', async () => {
            await settings.getByRole('button', 'Enable testnets').click();
            await expect(settings.btnTestnets.first()).not.toBeVisible();
            totalEthNetworks = await settings.btnEthNetworks.count();
            expect(totalEthNetworks).toBe(totalAllNetworks - totalTestnets);
        });
    });

    test('Ethereum Networks > Add/Remove EVM Network', async ({settings}) => {
        await test.step('go to Manage Ethereum Networks', async () => {
            await settings.getByRole('button', 'Manage Ethereum Networks').click();
        });
        for (const evm of data.evmNetworks) {
            const { rpc, rpc2, ...inputs } = evm;
            await test.step('click Add network. check required fields', async () => {
                await settings.getByRole('button', 'Add network').click();
                await settings.inputRpc.press('Tab');
                await settings.textError.getByText('required').first().waitFor();
                await settings.inputName.press('Tab');
                await settings.textError.getByText('required').nth(1).waitFor();
                await settings.inputTokenSymbol.press('Tab');
                await settings.textError.getByText('required').last().waitFor();
                await settings.inputTokenDecimals.press('Tab');
                await settings.textError.getByText('invalid number').waitFor();
                await expect(settings.getByRole('button', 'Add Network')).toBeDisabled();
            });
            await test.step('add a RPC URL', async () => {
                await settings.inputRpc.fill(rpc);
                await settings.imgDefaultNetwork.waitFor();
                await expect(settings.getByRole('button', 'Add Network')).toBeEnabled();
                await settings.inputTokenCoingeckoId.fill(inputs.tokenCoingeckoId);
                await settings.imgDefaultToken.waitFor({state: 'hidden'});
                await settings.checkInputValues(inputs);
            });
            await test.step('delete RPC URL', async () => {
                await settings.btnDeleteRpc.click();
                await settings.inputRpc.waitFor({state: 'hidden'});
                await settings.imgDefaultNetwork.waitFor();
                await expect(settings.getByRole('button', 'Add Network')).toBeDisabled();
            });
            await test.step('add back previous RPC URL', async() => {
                await settings.getByRole('button', 'Add another RPC').click();
                await settings.inputRpc.fill(rpc);
                await settings.imgDefaultNetwork.waitFor({state: 'hidden'});
                await expect(settings.getByRole('button', 'Add Network')).toBeEnabled();
                await settings.checkInputValues(inputs);
            });
            await test.step('add another RPC URL', async() => {
                await settings.getByRole('button', 'Add another RPC').click();
                await expect(settings.getByRole('button', 'Add Network')).toBeDisabled();
                await settings.inputRpc.last().fill(rpc2);
                await settings.imgDefaultNetwork.waitFor({state: 'hidden'});
                await expect(settings.getByRole('button', 'Add Network')).toBeEnabled();
                await settings.checkInputValues(inputs);
            });
            await test.step('change order in RPC list', async() => {
                await settings.dragAndDropRpc(settings.btnDragRpc.first(), settings.btnDragRpc.last());
                await expect(settings.inputRpc.first()).toHaveValue(rpc2);
                await expect(settings.inputRpc.last()).toHaveValue(rpc);
                await settings.checkInputValues(inputs);
                if (inputs.testnet) {
                    await settings.page.waitForTimeout(500);
                    await settings.ckbTestnet.click();
                }
            });
            await test.step('add network. check network list shows the newly added network', async () => {
                await settings.getByRole('button', 'Add Network').click();
                const loc = settings.btnEthNetwork(inputs.name);
                await loc.waitFor();
                await loc.getByText('custom').waitFor();
                if (inputs.testnet) {
                    await loc.getByText('testnet').waitFor();
                }
            });
            await test.step('remove network. check the network is removed from network list', async () => {
                await settings.btnEthNetwork(inputs.name).click();
                await settings.getByRole('button', 'Remove Network').click();
                await settings.getByRole('button', 'Remove', true).click();
                await settings.btnEthNetwork(inputs.name).waitFor({state: 'hidden'});
            });
        }
    });

    test('Change Password', async ({settings}) => {
        await test.step('go to Backup Wallet. toggle on Dont remind me', async () => {
            await settings.getByRole('button', 'Backup Wallet').click();
            await settings.inputPassword.fill(data.password);
            await settings.btnViewPhrase.click();
            await settings.btnToggle.click();
            await settings.iconClosePopup.click();
        });
        await test.step('go to Change password. check Submit button is disabled', async () => {
            await settings.getByRole('button', 'Change password').click();
            await expect(settings.getByRole('button', 'Submit')).toBeDisabled();
        });
        await test.step('enter new/confirm password with < 6 characters. check Submit button is disabled and error message is shown', 
        async () => {
            await settings.inputNewPwd.fill('12345');
            await expect(settings.textError.nth(1)).toHaveText('Password must be at least 6 characters long')
            await expect(settings.getByRole('button', 'Submit')).toBeDisabled();
            await settings.inputNewPwd.clear();
        });
        await test.step('enter new/confirm password that are not matched. check Submit button is disabled and error message is shown',
        async () => {
            await settings.inputNewPwd.fill('123456');
            await settings.inputConfirmPwd.fill('654321');
            await expect(settings.textError.last()).toHaveText('Passwords must match!')
            await expect(settings.getByRole('button', 'Submit')).toBeDisabled();
            await settings.inputConfirmPwd.clear();
        });
        await test.step('enter invalid current password. check warning error is shown', async () => {
            await settings.inputConfirmPwd.fill('123456');
            await settings.inputOldPwd.fill('abcdef');
            await settings.getByRole('button', 'Submit').click();
            await settings.getByRole('alert').getByText('Error changing password').waitFor();
            await expect(settings.textError.first()).toHaveText('Incorrect password')
            await settings.getByRole('alert').waitFor({state: 'hidden'});
        });
        await test.step('enter valid current password. check password is changed', async () => {
            await settings.inputOldPwd.clear();
            await settings.inputOldPwd.fill('123456');
            await settings.getByRole('button', 'Submit').click();
            await settings.getByRole('alert').getByText('Password changed').waitFor();
        });
    });

    test('About', async ({context, common}) => {
        await test.step('go to About. check Talisman URL is correct', async () => {
            await common.getByRole('button', 'About').click();
            await expect(common.getByRole('link', 'Talisman')).toHaveAttribute('href', 'https://talisman.xyz');
        });
        await test.step('check external URLs are correct', async () => {
            await common.getByRole('button', 'Help and Support').click();
            let pageExt = await context.waitForEvent('page');
            expect(pageExt.url()).toBe('https://discord.com/invite/EF3Zf4R5bD');
            await pageExt.close();
    
            await common.getByRole('button', 'Docs').click();
            pageExt = await context.waitForEvent('page');
            expect(pageExt.url()).toBe('https://docs.talisman.xyz/talisman/introduction/welcome-to-the-paraverse');
            await pageExt.close();
    
            await common.getByRole('button', 'Changelog').click();
            pageExt = await context.waitForEvent('page');
            expect(pageExt.url()).toBe('https://docs.talisman.xyz/talisman/prepare-for-your-journey/wallet-release-notes');
            await pageExt.close();
    
            await common.getByRole('button', 'Privacy Policy').click();
            pageExt = await context.waitForEvent('page');
            expect(pageExt.url()).toBe('https://docs.talisman.xyz/talisman/prepare-for-your-journey/privacy-policy');
            await pageExt.close();
    
            await common.getByRole('button', 'Terms of Use').click();
            pageExt = await context.waitForEvent('page');
            expect(pageExt.url()).toBe('https://docs.talisman.xyz/talisman/prepare-for-your-journey/terms-of-use');
            await pageExt.close(); 
        });
    });
});