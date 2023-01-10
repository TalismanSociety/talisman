import { Drawer } from "@talisman/components/Drawer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { AlertCircleIcon } from "@talisman/theme/icons"
import Terrarium from "@talisman/theme/images/forgot_password_terrarium.png"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useEffect } from "react"
import { Button } from "talisman-ui"

import Layout, { Content, Footer } from "../Layout"

const ConfirmDrawer = ({ isOpen }: { isOpen: boolean }) => {
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
          <Button fullWidth primary>
            Continue
          </Button>
          <Button fullWidth>Cancel</Button>
        </div>
      </div>
    </Drawer>
  )
}

export const ResetWallet = () => {
  const { popupOpenEvent } = useAnalytics()
  const { open, isOpen } = useOpenClose()

  useEffect(() => {
    popupOpenEvent("reset wallet")
  }, [popupOpenEvent])

  return (
    <Layout className="p-4">
      <Content className="mt-24">
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
      <ConfirmDrawer isOpen={isOpen} />
    </Layout>
  )
}
