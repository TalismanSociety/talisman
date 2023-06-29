import { yupResolver } from "@hookform/resolvers/yup"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { InputFileDrop } from "@talisman/components/InputFileDrop"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import Spacer from "@talisman/components/Spacer"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import Layout from "../layout"

type FormData = {
  fileContent: string
  password: string
}

const schema = yup
  .object({
    fileContent: yup.string().required(""),
    password: yup.string().required(""),
  })
  .required()

const getFileContent = (file?: File) =>
  new Promise<string>((resolve) => {
    if (file) {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve("")
      reader.readAsText(file)
    } else resolve("")
  })

const AccountJson = () => {
  const { t } = useTranslation("admin")
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  const submit = useCallback(
    async ({ fileContent, password }: FormData) => {
      const notificationId = notify(
        {
          type: "processing",
          title: t("Importing account"),
          subtitle: t("Please wait"),
        },
        { autoClose: false }
      )
      try {
        setAddress(await api.accountCreateFromJson(fileContent, password))
        notifyUpdate(notificationId, {
          type: "success",
          title: t("Account created"),
          subtitle: "",
        })
      } catch (err) {
        notifyUpdate(notificationId, {
          type: "error",
          title: t("Error importing account"),
          subtitle: (err as Error)?.message,
        })
      }
    },
    [setAddress, t]
  )

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const handleFileChange = useCallback(
    async (file?: File) => {
      setValue("fileContent", await getFileContent(file), {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      })
    },
    [setValue]
  )

  return (
    <Layout withBack centered>
      <HeaderBlock
        title={t("Import JSON")}
        text={t("Please choose the .json file you exported from Polkadot.js or Talisman")}
      />
      <Spacer />
      <form data-button-pull-left onSubmit={handleSubmit(submit)}>
        <FormFieldContainer error={errors.fileContent?.message}>
          <InputFileDrop
            onChange={handleFileChange}
            inputProps={{
              accept: "application/json",
              placeholder: t("Choose a .json file"),
            }}
          />
        </FormFieldContainer>
        <Spacer />
        <div className="text-body-secondary">
          {t("Please enter the password you set when creating your polkadot.js account")}
        </div>
        <div className="h-4" />
        <div className="text-body-disabled text-sm">
          {t("Your account will be re-encrypted with your Talisman password")}
        </div>
        <div className="h-8" />
        <FormFieldContainer error={errors.password?.message}>
          <FormFieldInputText
            {...register("password")}
            type="password"
            placeholder={t("Enter your password")}
            spellCheck={false}
            data-lpignore
          />
        </FormFieldContainer>
        <div className="h-4" />
        <Button
          icon={ArrowRightIcon}
          type="submit"
          primary
          disabled={!isValid}
          processing={isSubmitting}
        >
          {t("Import")}
        </Button>
      </form>
    </Layout>
  )
}

export default AccountJson
