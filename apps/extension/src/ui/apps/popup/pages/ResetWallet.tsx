import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { AlertCircleIcon, ChevronLeftIcon } from "@talisman/theme/icons"
import Terrarium from "@talisman/theme/images/forgot_password_terrarium.png"
import { api } from "@ui/api"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useCallback, useEffect, useState } from "react"
import { Button } from "talisman-ui"

import Layout, { Content, Footer } from "../Layout"

const ConfirmDrawer = ({
  isOpen,
  closeResetWallet,
}: {
  isOpen: boolean
  closeResetWallet: () => void
}) => {
  const [resetting, setResetting] = useState(false)

  const handleReset = useCallback(async () => {
    setResetting(true)
    // don't wait for the response here, or the normal onboarding tab will open
    api.resetWallet()
    window.close()
  }, [])

  return (
    <Drawer open={isOpen} anchor="bottom">
      <div className="bg-grey-800 items-center rounded-t p-8 pt-12">
        <div className="flex flex-col gap-6 px-12 text-center">
          <div className="text-xl">
            <AlertCircleIcon className="text-alert-warn" />
          </div>
          <h2 className="font-bold text-white ">Are you sure you want to reset Talisman?</h2>
        </div>

        <p className="text-body-secondary p-4 text-center text-sm">
          Your current wallet, accounts and assets will be erased from this wallet. You will need to
          re-import your account via recovery phrase. Note that you may have to re-add any other
          imported accounts such as Ledger devices.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <Button fullWidth onClick={handleReset} primary processing={resetting}>
            Continue
          </Button>
          <Button fullWidth onClick={closeResetWallet}>
            Cancel
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

export const ResetWallet = ({ closeResetWallet }: { closeResetWallet: () => void }) => {
  const { popupOpenEvent } = useAnalytics()
  const { open, isOpen } = useOpenClose()

  useEffect(() => {
    popupOpenEvent("reset wallet")
  }, [popupOpenEvent])

  return (
    <Layout className="p-4">
      <div className="text-body-secondary flex h-32 justify-center px-12 pr-[16px] align-middle">
        <ChevronLeftIcon
          className="flex-shrink cursor-pointer text-lg hover:text-white"
          onClick={closeResetWallet}
        />
        <span className="flex-grow pr-[24px] text-center">Reset Wallet</span>
      </div>
      <Content>
        <div className="flex flex-col items-center gap-24">
          <img src={Terrarium} />
          <p className="text-body-secondary text-center">
            To reset your wallet you'll need to re-import your account via recovery phrase and set a
            new password.
          </p>
        </div>
      </Content>
      <Footer>
        <Button fullWidth primary onClick={open}>
          Reset wallet
        </Button>
      </Footer>
      <ConfirmDrawer isOpen={isOpen} closeResetWallet={closeResetWallet} />
    </Layout>
  )
}
