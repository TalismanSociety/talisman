import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import StatusIcon from "@talisman/components/StatusIcon"
import Terrarium from "@talisman/theme/images/forgot_password_terrarium.png"
import { api } from "@ui/api"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useCallback, useEffect, useRef } from "react"
import { SubmitHandler, useForm } from "react-hook-form"
import styled from "styled-components"
import { Button } from "talisman-ui"

import Layout, { Content, Footer, Header } from "../Layout"

export const ResetWallet = () => {
  const { popupOpenEvent } = useAnalytics()

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
            new password. Talisman never has access to your recovery phrase or password.
          </p>
        </div>
      </Content>
      <Footer>
        <Button fullWidth primary>
          Reset wallet
        </Button>
      </Footer>
    </Layout>
  )
}
