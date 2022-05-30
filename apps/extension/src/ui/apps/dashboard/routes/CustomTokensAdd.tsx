import { DEBUG } from "@core/constants"
import { CustomErc20TokenCreate } from "@core/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { PlusIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { NetworkSelect } from "@ui/domains/Ethereum/NetworkSelect"
import { useEthereumNetworks } from "@ui/hooks/useEthereumNetworks"
import { useCallback, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import * as yup from "yup"

const Form = styled.form`
  margin: 4.2rem 0;
  display: flex;
  flex-direction: column;
  gap: 2.4rem;

  .field-header + .children {
    margin-top: 0.8rem;
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`

const Split = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.4rem;
`

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  // margin-top: 1.6rem;

  button {
    .btn-content {
      gap: 0.6rem;
      svg {
        font-size: 2rem;
      }
    }
  }
`

const Error = styled.div`
  color: var(--color-status-error);
`

type FormData = Pick<
  CustomErc20TokenCreate,
  "evmNetworkId" | "contractAddress" | "symbol" | "decimals"
>

const DEFAULT_VALUE = DEBUG
  ? {
      contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      decimals: 6,
      evmNetworkId: 1085,
      symbol: "USDC",
    }
  : ({} as FormData)

export const CustomTokensAdd = () => {
  const navigate = useNavigate()
  const networks = useEthereumNetworks()

  const schema = useMemo(
    () =>
      yup
        .object({
          evmNetworkId: yup
            .number()
            .required()
            .oneOf(
              networks.map(({ id }) => id),
              "Invalid network"
            ),
          contractAddress: yup
            .string()
            .required()
            .matches(/^0x[0-9a-fA-F]{40}$/, "Invalid address"),
          symbol: yup.string().required(),
          decimals: yup
            .number()
            .min(0, "Invalid value")
            .max(255, "Invalid value")
            .test("isInteger", "Invalid value", (value?: number) =>
              /^[0-9]*$/.test(value?.toString() ?? "")
            ),
        })
        .required(),
    [networks]
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: DEFAULT_VALUE,
    resolver: yupResolver(schema),
  })

  const tmp = watch()
  console.log({ tmp, errors, isValid, isSubmitting })

  const [error, setError] = useState<string>()
  const submit = useCallback(
    async (token: FormData) => {
      try {
        console.log("token", token)
        //return
        await api.addCustomErc20Token(token)
        navigate("/")
      } catch (err) {
        console.error(err, { err })
        setError(`Failed to add the token : ${(err as Error)?.message ?? ""}`)
      }
    },
    [navigate]
  )

  const handleNetworkChange = useCallback(
    (id: number) => {
      setValue("evmNetworkId", id, { shouldValidate: true })
    },
    [setValue]
  )

  return (
    <Layout withBack centered>
      <HeaderBlock
        title="Add custom token"
        text="Tokens can be created by anyone and named however they like, even to imitate existing tokens. Always ensure you have verified the token address before adding a custom token."
      />
      <Form onSubmit={handleSubmit(submit)}>
        <FormField label="Network" error={errors.evmNetworkId}>
          <NetworkSelect placeholder="Select a network" onChange={handleNetworkChange} />
        </FormField>
        <FormField label="Contract Address" error={errors.contractAddress}>
          <input
            {...register("contractAddress")}
            spellCheck={false}
            data-lpignore
            type="text"
            autoComplete="off"
            placeholder="Paste token address"
          />
        </FormField>
        <Split>
          <FormField label="Symbol" error={errors.symbol}>
            <input {...register("symbol")} type="text" placeholder="ABC" autoComplete="off" />
          </FormField>
          <FormField label="Decimals" error={errors.decimals}>
            <input
              {...register("decimals", {
                valueAsNumber: true,
              })}
              type="number"
              placeholder="0"
              autoComplete="off"
            />
          </FormField>
        </Split>
        <Error>{error}</Error>
        <Footer>
          <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
            <PlusIcon />
            Add Token
          </SimpleButton>
        </Footer>
      </Form>
    </Layout>
  )
}
