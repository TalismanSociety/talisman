import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { InputFileDrop } from "@talisman/components/InputFileDrop"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { SimpleButton } from "@talisman/components/SimpleButton"
import Spacer from "@talisman/components/Spacer"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
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
  const navigate = useNavigate()

  const submit = useCallback(
    async ({ fileContent, password }: FormData) => {
      const notificationId = notify(
        {
          type: "processing",
          title: "Importing account",
          subtitle: "Please wait",
        },
        { autoClose: false }
      )
      try {
        await api.accountCreateFromJson(fileContent, password)
        notifyUpdate(notificationId, {
          type: "success",
          title: "Account created",
          subtitle: "",
        })
        navigate("/portfolio")
      } catch (err) {
        notifyUpdate(notificationId, {
          type: "error",
          title: "Error importing account",
          subtitle: (err as Error)?.message,
        })
      }
    },
    [navigate]
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
        title="Import from Polkadot.js"
        text="Please choose the .json file you exported from Polkadot.js"
      />
      <Spacer />
      <form data-button-pull-left onSubmit={handleSubmit(submit)}>
        <FormField error={errors.fileContent}>
          <InputFileDrop
            onChange={handleFileChange}
            inputProps={{
              accept: "application/json",
              placeholder: "Choose a .json file",
            }}
          />
        </FormField>
        <Spacer />
        <FormField
          label="Please enter the password you set when creating your polkadot.js account"
          info="Your account will be re-encrypted with your Talisman password"
          error={errors.password}
        >
          <input
            {...register("password")}
            type="password"
            placeholder="Enter your password"
            spellCheck={false}
            data-lpignore
          />
        </FormField>
        <Spacer />
        <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
          Import <ArrowRightIcon />
        </SimpleButton>
      </form>
    </Layout>
  )
}

export default AccountJson
