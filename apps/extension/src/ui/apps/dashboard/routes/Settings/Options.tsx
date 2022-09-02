import { SettingsStoreData } from "@core/domains/app"
import { EvmNetwork } from "@core/types"
import Field from "@talisman/components/Field"
import Grid from "@talisman/components/Grid"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import Setting from "@talisman/components/Setting"
import { SimpleButton } from "@talisman/components/SimpleButton"
import Spacer from "@talisman/components/Spacer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { AvatarTypeSelect } from "@ui/domains/Settings/AvatarTypeSelect"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSettings } from "@ui/hooks/useSettings"
import { useCallback, useEffect, useState } from "react"
import styled from "styled-components"

const Button = styled(SimpleButton)`
  width: auto;
`

const ModalDescription = styled.p`
  color: var(--color-mid);
  text-align: center;
  font-size: var(--font-size-normal);
  padding: 0.8rem 1.8rem;
`

const CustomNetworksCount = styled.span`
  margin-right: 1.6rem;

  display: flex;
  flex-direction: column;
  align-items: center;

  span {
    display: block;
    width: 2.4rem;
    height: 2.4rem;
    color: var(--color-primary);
    background: rgba(213, 255, 92, 0.12);
    text-align: center;
    border-radius: 50%;
    line-height: 2.4rem;
    padding-top: 0.1rem;
  }
`

const Options = () => {
  const {
    identiconType = "talisman-orb",
    useTestnets = false,
    useCustomEthereumNetworks,
    hideBalances = false,
    allowNotifications = true,
    shouldMimicMetaMask = false,
    useSmoldot = false,
    update,
  } = useSettings()

  const handleSettingChange = useCallback(
    <K extends keyof SettingsStoreData>(key: K) =>
      (value: SettingsStoreData[K]) => {
        update({ [key]: value })
      },
    [update]
  )

  const [customEthNetworksCount, setCustomEthNetworksCount] = useState<number>()
  const evmNetworks = useEvmNetworks()
  useEffect(() => {
    if (!useCustomEthereumNetworks) return setCustomEthNetworksCount(0)
    if (!evmNetworks) return setCustomEthNetworksCount(undefined)

    const count = evmNetworks.filter(
      (evmNetwork) => "isCustom" in evmNetwork && evmNetwork.isCustom
    ).length
    setCustomEthNetworksCount(count || 0)
  }, [evmNetworks, useCustomEthereumNetworks])

  const { isOpen, open, close } = useOpenClose()
  const handleCustomEVMNetworksChange = useCallback(
    async (newValue: boolean) => {
      if (newValue) {
        open()
      } else {
        api.clearCustomEthereumNetworks()
        update({ useCustomEthereumNetworks: false })
      }
    },
    [open, update]
  )

  const handleConfirmEVMNetworks = useCallback(() => {
    update({ useCustomEthereumNetworks: true })
    close()
  }, [close, update])

  return (
    <Layout centered withBack>
      <HeaderBlock title="Extension options" text="Customise your extension experience" />
      <Spacer />
      <Grid columns={1}>
        {useTestnets !== undefined && (
          <Setting title="Enable Testnets" subtitle="Connect to test networks (Westend, Mandala)">
            <Field.Toggle value={useTestnets} onChange={handleSettingChange("useTestnets")} />
          </Setting>
        )}
        <Setting
          title="Unstoppable Connection"
          // TODO: insert link to docs
          subtitle="Sidestep RPCs and make your connection to the Polkadot Relay Chain with a Light Client."
        >
          <Field.Toggle value={useSmoldot} onChange={handleSettingChange("useSmoldot")} />
        </Setting>
        <Setting
          title="Allow notifications"
          subtitle="Allow Talisman to send you notifications about transactions in progress"
        >
          <Field.Toggle
            value={allowNotifications}
            onChange={handleSettingChange("allowNotifications")}
          />
        </Setting>
        <Setting title="Hide Balances" subtitle="Blurs your portfolio and account balances">
          <Field.Toggle value={hideBalances} onChange={handleSettingChange("hideBalances")} />
        </Setting>
        <Setting
          title="Account Avatars"
          subtitle="Choose between the Talisman orbs or Polkadot.js identicons"
        >
          <AvatarTypeSelect
            selectedType={identiconType}
            onChange={handleSettingChange("identiconType")}
          />
        </Setting>
        <Setting
          title="Enable custom EVM networks (for developers)"
          subtitle="Manually add custom EVM networks"
        >
          {useCustomEthereumNetworks ? (
            <CustomNetworksCount>
              <span>{customEthNetworksCount ?? "?"}</span>
            </CustomNetworksCount>
          ) : null}
          <Field.Toggle
            value={useCustomEthereumNetworks}
            onChange={handleCustomEVMNetworksChange}
          />
        </Setting>
        <Modal open={isOpen} onClose={close}>
          <ModalDialog centerTitle title="Warning" onClose={close}>
            <ModalDescription>
              Talisman does not verify custom networks. For this reason this feature is only
              recommended for advanced users and software developers.
            </ModalDescription>
            <Grid>
              <Button onClick={close}>Cancel</Button>
              <Button primary onClick={handleConfirmEVMNetworks}>
                Continue
              </Button>
            </Grid>
          </ModalDialog>
        </Modal>
        <Setting
          title="MetaMask Dapp compatibility"
          subtitle="Allows using Talisman on applications that support MetaMask only. Leave this turned off if you use MetaMask in the same browser as Talisman."
        >
          <Field.Toggle
            value={shouldMimicMetaMask}
            onChange={handleSettingChange("shouldMimicMetaMask")}
          />
        </Setting>
      </Grid>
    </Layout>
  )
}

export default Options
