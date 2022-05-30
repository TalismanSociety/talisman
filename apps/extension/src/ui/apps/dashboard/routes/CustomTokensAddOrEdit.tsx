import { CustomErc20TokenCreate } from "@core/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { PlusIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { NetworkSelect } from "@ui/domains/Ethereum/NetworkSelect"
import { useCustomErc20Tokens } from "@ui/hooks/useCustomErc20Tokens"
import { useEthereumNetworks } from "@ui/hooks/useEthereumNetworks"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate, useParams } from "react-router-dom"
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

  input:disabled {
    cursor: not-allowed;
    color: var(--color-mid);
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

export const CustomTokensAddOrEdit = () => {
  let { id } = useParams<"id">()
  const navigate = useNavigate()
  const networks = useEthereumNetworks()

  const { customErc20Tokens } = useCustomErc20Tokens()

  const defaultValues: FormData = useMemo(
    () => (customErc20Tokens?.find((t) => t.id === id) as FormData) ?? {},
    [customErc20Tokens, id]
  )

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
    setValue,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues,
    resolver: yupResolver(schema),
  })

  const [error, setError] = useState<string>()
  const submit = useCallback(
    async (token: FormData) => {
      try {
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

  useEffect(() => {
    reset(defaultValues)
  }, [defaultValues, reset])

  // wait for tokens to be loaded to prevent flickering
  if (!customErc20Tokens) return null

  return (
    <Layout withBack centered>
      <HeaderBlock
        title={`${id ? "Edit" : "Add"} custom token`}
        text="Tokens can be created by anyone and named however they like, even to imitate existing tokens. Always ensure you have verified the token address before adding a custom token."
      />
      <Form onSubmit={handleSubmit(submit)}>
        <FormField label="Network" error={errors.evmNetworkId}>
          <NetworkSelect
            placeholder="Select a network"
            onChange={handleNetworkChange}
            defaultChainId={defaultValues?.evmNetworkId}
            // disabling network edit because it would create a new token
            disabled={Boolean(id)}
          />
        </FormField>
        <FormField label="Contract Address" error={errors.contractAddress}>
          <input
            {...register("contractAddress")}
            spellCheck={false}
            data-lpignore
            type="text"
            autoComplete="off"
            placeholder="Paste token address"
            // a token cannot change address
            disabled={Boolean(id)}
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
            {Boolean(id) ? (
              "Edit Token"
            ) : (
              <>
                <PlusIcon />
                Add Token
              </>
            )}
          </SimpleButton>
        </Footer>
      </Form>
    </Layout>
  )
}
