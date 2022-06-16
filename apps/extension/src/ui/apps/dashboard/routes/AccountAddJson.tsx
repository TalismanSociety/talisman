import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import { useNavigate } from "react-router-dom"
import { useNotification } from "@talisman/components/Notification"
import Layout from "../layout"
import { FormField } from "@talisman/components/Field/FormField"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import { useCallback } from "react"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { useForm } from "react-hook-form"
import { InputFileDrop } from "@talisman/components/InputFileDrop"
import { api } from "@ui/api"

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
  const notification = useNotification()

  const submit = useCallback(
    async ({ fileContent, password }: FormData) => {
      notification.processing({
        title: "Importing account",
        subtitle: "Please wait",
        timeout: null,
      })
      try {
        await api.accountCreateFromJson(fileContent, password)
        notification.success({
          title: "Account created",
          subtitle: "",
        })
        navigate("/portfolio")
      } catch (err) {
        notification.error({
          title: "Error creating account",
          subtitle: (err as Error)?.message ?? "",
        })
      }
    },
    [navigate, notification]
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
