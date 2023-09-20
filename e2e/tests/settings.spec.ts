import test, { expect } from '../fixtures/setup';
import data from '../fixtures/data';

test.describe('Settings', () => {
    test.beforeEach(async ({onboarding}) => {
        await test.step('create new wallet', async () => {
            await onboarding.getByRole('button', 'Get Started').click();
            await onboarding.createNewPolkadotWallet(data.password, data.dotAccountName);
        });
        await test.step('go to Settings', async () => {
            await onboarding.getByRole('link', 'Settings').click();
        });
    });

    test.afterEach(async ({context}) => {
        await context.close();
    });

    test('Backup Wallet', async ({page, settings}) => {
        await test.step('go to Security & Privacy. check Change password button is disabled', async () => {
            await settings.getByRole('link', 'Security & Privacy').click();
            await expect(settings.getByRole('button', 'Change password')).toBeDisabled();
        });
        await test.step('go to Recovery Phrases > Backup. check View Recovery Phrase button is disabled', async () => {
            await settings.getByRole('link', 'Recovery Phrases').click();
            await settings.getByRole('button', 'Backup').click();
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
            expect(copiedPhrase).toEqual(await settings.textPhrase.allTextContents());
        });
        await test.step('select I have backed up my recovery phrase. check Change password button is enabled', async () => {
            await expect(settings.ckbBackup).toBeDisabled();
            await expect(settings.ckbBackup).not.toBeChecked();
            await settings.btnReveal.click();
            await settings.ckbBackup.click();
            await expect(settings.ckbBackup).toBeChecked();
            await settings.iconClosePopup.click();
        });
        await test.step('check Change password button is enabled', async () => {
            await settings.getByRole('link', 'Security & Privacy').click();
            await expect(settings.getByRole('button', 'Change password')).toBeEnabled();
        });
    });

    test('Connected Sites', async ({settings}) => {
        await test.step('go to Connected Sites. check portal is connected', async () => {
            await settings.getByRole('link', 'Connected Sites').click();
            await expect(settings.textAccountCount).toHaveText('1 of 1');
            await settings.getByRole('button', 'Talisman').click();
            await expect(settings.getByText(data.dotAccountName)).toBeVisible();
        });
        await test.step('disonnect all accounts in wallet. check portal is disconnected', async () => {
            await settings.getByRole('button', 'Disconnect All').click();
            await expect(settings.textAccountCount).toHaveText('0 of 1');
        });
        await test.step('connect all accounts in wallet. check portal is connected', async () => {
            await settings.getByRole('button', 'Connect All', true).click();
            await expect(settings.textAccountCount).toHaveText('1 of 1');
        });
        await test.step('forget site in wallet. check portal is disconnected and removed from wallet', 
        async () => {
            await settings.getByRole('button', 'Forget Site').click();
            await settings.getByRole('button', 'Cancel').click();
            await expect(settings.textAccountCount).toHaveText('1 of 1');
            await settings.getByRole('button', 'Forget Site').first().click();
            await settings.getByRole('button', 'Forget Site').last().click();
            await expect(settings.getByRole('button', 'Talisman')).not.toBeVisible();
            await expect(settings.getByText(data.dotAccountName)).not.toBeVisible();
        });
    });

    test('Address Book', async ({settings}) => {
        await test.step('go to Address Book. check Polkadot tab is selected by default', 
        async () => {
            await settings.getByRole('link', 'Address Book').click();
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
            await expect(settings.getByText(data.dotName, 'button')).toBeVisible();
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
            await expect(settings.getByText(data.ethName, 'button')).toBeVisible();
            await expect(settings.getByText(data.ethAddress.slice(0, 4) + '…' + data.ethAddress.slice(-4))).toBeVisible();       
        });
    });

    test('General > enable/disable testnets', async ({page, settings}) => {
        await test.step('go to Networks & Tokens > Manage Networks. check testnet is disabled', 
        async () => {
            await settings.getByRole('link', 'Networks & Tokens').click();
            await settings.getByRole('button', 'Manage Networks').click();
            await expect(settings.btnTestnets).not.toBeVisible();
        });
        await test.step('go to General. enable testnets option', 
        async () => {
            await settings.getByRole('link', 'General').click();
            await settings.btnToggle.nth(1).click();
        });
        await test.step('go to Networks & Tokens > Manage Networks. check testnet is enabled', 
        async () => {
            await settings.getByRole('link', 'Networks & Tokens').click();
            await settings.getByRole('button', 'Manage Networks').click();
            await settings.inputSearchNetworks.fill(data.ethTestnet);
            await settings.btnEthNetwork(data.ethTestnet).waitFor();
        });
        await test.step('go to General. disable testnets option', 
        async () => {
            await settings.getByRole('link', 'General').click();
            await settings.btnToggle.nth(1).click();
        });
        await test.step('go to Networks & Tokens > Manage Networks. check testnet is disabled', 
        async () => {
            await settings.getByRole('link', 'Networks & Tokens').click();
            await settings.getByRole('button', 'Manage Networks').click();
            await settings.inputSearchNetworks.fill(data.ethTestnet);
            await settings.btnEthNetwork(data.ethTestnet).waitFor({state: 'hidden'});
        });
    });

    test('Manage Networks > enable/disable testnets', async ({page, settings}) => {
        await test.step('go to Networks & Tokens > Manage Networks. check testnet is disabled', async () => {
            await settings.getByRole('link', 'Networks & Tokens').click();
            await settings.getByRole('button', 'Manage Networks').click();
            await settings.inputSearchNetworks.fill(data.ethTestnet);
            await settings.btnEthNetwork(data.ethTestnet).waitFor({state: 'hidden'});
        });
        await test.step('click Enable testnets. check testnet is enabled', async () => {
            await settings.getByRole('button', 'Enable testnets').click();
            await settings.inputSearchNetworks.fill(data.ethTestnet);
            await settings.btnEthNetwork(data.ethTestnet).waitFor();
        });
        await test.step('click Enable testnets. check testnet is disabled', async () => {
            await settings.getByRole('button', 'Enable testnets').click();
            await settings.inputSearchNetworks.fill(data.ethTestnet);
            await settings.btnEthNetwork(data.ethTestnet).waitFor({state: 'hidden'});
        });
    });

    test('Manage Networks > Add/Remove EVM Network', async ({page, settings}) => {
        await test.step('go to Networks & Tokens > Manage Networks', async () => {
            await settings.getByRole('link', 'Networks & Tokens').click();
            await settings.getByRole('button', 'Manage Networks').click();
        });
        for (const evm of data.evmNetworks) {
            const { rpc, rpc2, ...inputs } = evm;
            await test.step(`add ${inputs.name}. click Add network. check required fields`, async () => {
                await settings.getByRole('button', 'Add network').click();
                await settings.inputRpc.press('Tab');
                await settings.textError.getByText('required').first().waitFor();
                await settings.inputName.press('Tab');
                await settings.textError.getByText('required').nth(1).waitFor();
                await settings.inputTokenSymbol.press('Tab');
                await settings.textError.getByText('required').last().waitFor();
                await settings.inputTokenDecimals.press('Tab');
                await settings.textError.getByText('Must be a number').waitFor();
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
                await settings.inputSearchNetworks.fill(inputs.name);
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
        await test.step('go to Recovery Phrases > Backup Wallet. Select I have backed up my recovery phrase', async () => {
            await settings.getByRole('link', 'Recovery Phrases').click();
            await settings.getByRole('button', 'Backup').click();
            await settings.inputPassword.fill(data.password);
            await settings.btnViewPhrase.click();
            await settings.btnReveal.click();
            await settings.ckbBackup.click();
            await expect(settings.ckbBackup).toBeChecked();
            await settings.iconClosePopup.click();
        });
        await test.step('go to Change password. check Submit button is disabled', async () => {
            await settings.getByRole('link', 'Security & Privacy').click();
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
            await common.getByRole('link', 'About').click();
            await expect(common.getByRole('link', 'Talisman')).toHaveAttribute('href', 'https://talisman.xyz');
        });
        await test.step('check external URLs are correct', async () => {
            await common.getByRole('button', 'Help and Support').click();
            await context.waitForEvent('page').then(async page => {
                expect(page.url()).toBe('https://discord.com/invite/EF3Zf4R5bD')
                await page.close();
            });

            await common.getByRole('button', 'Docs').click();
            await context.waitForEvent('page').then(async page => {
                expect(page.url()).toBe('https://docs.talisman.xyz/talisman/introduction/welcome-to-the-paraverse')
                await page.close();
            });

            await common.getByRole('button', 'Changelog').click();
            await context.waitForEvent('page').then(async page => {
                expect(page.url()).toBe('https://docs.talisman.xyz/talisman/prepare-for-your-journey/wallet-release-notes')
                await page.close();
            });

            await common.getByRole('button', 'Privacy Policy').click();
            await context.waitForEvent('page').then(async page => {
                expect(page.url()).toBe('https://docs.talisman.xyz/talisman/prepare-for-your-journey/privacy-policy')
                await page.close();
            });
    
            await common.getByRole('button', 'Terms of Use').click();
            await context.waitForEvent('page').then(async page => {
                expect(page.url()).toBe('https://docs.talisman.xyz/talisman/prepare-for-your-journey/terms-of-use')
                await page.close();
            });
        });
    });
});