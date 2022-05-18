import styled from "styled-components"
import { Layout } from "../layout"
import imgHood from "@talisman/theme/images/onboard_hood.png"
import { useOnboard } from "../context"
import { useCallback, useMemo } from "react"
import { api } from "@ui/api"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { useNavigate } from "react-router-dom"
import { FormField } from "@talisman/components/Field/FormField"

const Description = styled.p`
  margin-bottom: 1.6rem;
`

const Image = styled.img`
  height: 70.8rem;
  width: 47.5rem;

  @media (max-width: 1146px) {
    height: calc(0.75 * 70.8rem);
    width: calc(0.75 * 47.5rem);
  }
`

const BtnRestore = styled(SimpleButton)`
  margin-top: 4rem;
  width: 24rem;
`

type FormData = {
  mnemonic?: string
}

const cleanupMnemonic = (input: string = "") =>
  input
    .trim()
    .toLowerCase()
    .split(/[\s\r\n]+/g) //split on whitespace or carriage return
    .filter(Boolean) //remove empty strings
    .join(" ")

const schema = yup
  .object({
    mnemonic: yup
      .string()
      .trim()
      .required("")
      .transform(cleanupMnemonic)
      .test("is-valid-mnemonic", "Invalid secret", (val) =>
        api.accountValidateMnemonic(val as string)
      ),
  })
  .required()

export const EnterSecret = () => {
  const navigate = useNavigate()
  const { data: defaultValues, updateData } = useOnboard()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues,
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    (fields: FormData) => {
      // mnemonic from this object is already transformed with cleanupMnemonic
      updateData(fields)
      navigate("/create/name")
    },
    [navigate, updateData]
  )

  const mnemonic = watch("mnemonic")
  const words = useMemo(
    () => cleanupMnemonic(mnemonic).split(" ").filter(Boolean).length ?? 0,
    [mnemonic]
  )

  return (
    <Layout withBack picture={<Image src={imgHood} alt="Hood" />}>
      <h1>Restore From Secret Phrase</h1>
      <Description>Please enter your 12 or 24 word secret phrase separated by a space.</Description>
      <form onSubmit={handleSubmit(submit)}>
        <FormField error={errors.mnemonic} extra={`Word count : ${words}`}>
          <textarea
            {...register("mnemonic")}
            placeholder="Start typing..."
            rows={5}
            data-lpignore
            spellCheck={false}
            autoFocus
          />
        </FormField>
        <BtnRestore type="submit" primary disabled={!isValid}>
          Restore
        </BtnRestore>
      </form>
    </Layout>
  )
}
