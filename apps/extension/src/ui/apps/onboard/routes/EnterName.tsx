import { useCallback } from "react"
import styled from "styled-components"
import { useOnboard } from "../context"
import { Layout } from "../layout"
import imgSwami from "@talisman/theme/images/onboard_swami.png"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { useNavigate } from "react-router-dom"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import { FormField } from "@talisman/components/Field/FormField"
import { motion } from "framer-motion"

const Image = styled(motion.img)`
  // force size to avoid page layout shift on load
  height: 60rem;
  width: 51.763rem;

  @media (max-width: 1146px) {
    height: calc(0.75 * 60rem);
    width: calc(0.75 * 51.763rem);
  }
`

const BtnNext = styled(SimpleButton)`
  margin-top: 2.4rem;
  width: 24rem;
  svg {
    font-size: var(--font-size-large);
  }
`

type FormData = {
  name?: string
}

const schema = yup
  .object({
    name: yup.string().required(""),
  })
  .required()

export const EnterName = () => {
  const navigate = useNavigate()
  const { data: defaultValues, updateData } = useOnboard()
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues,
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    (fields: FormData) => {
      updateData(fields)
      navigate("/create/pass")
    },
    [navigate, updateData]
  )

  return (
    <Layout withBack picture={<Image src={imgSwami} alt="Swami" />}>
      <h1>
        Adventure awaits!
        <br />
        Let’s give your account a name.
      </h1>
      <p>Don’t worry, you can always change this later.</p>
      <form onSubmit={handleSubmit(submit)}>
        <FormField error={errors.name}>
          <input
            {...register("name")}
            placeholder="Choose a name"
            spellCheck={false}
            autoComplete="off"
            autoFocus
            data-lpignore
          />
        </FormField>
        <BtnNext type="submit" primary disabled={!isValid}>
          Create account <ArrowRightIcon />
        </BtnNext>
      </form>
    </Layout>
  )
}
