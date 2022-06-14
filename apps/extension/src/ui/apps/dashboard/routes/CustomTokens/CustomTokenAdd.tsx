import { CustomErc20TokenCreate } from "@core/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { PlusIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { NetworkSelect } from "@ui/domains/Ethereum/NetworkSelect"
import { useSortedEvmNetworks } from "@ui/hooks/useSortedEvmNetworks"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import * as yup from "yup"
import { useErc20TokenInfo } from "@ui/hooks/useErc20TokenInfo"
import { assert } from "@polkadot/util"
import {
  commonFormStyle,
  ErrorDiv,
  Footer,
  LoadingSuffix,
  Split,
  SymbolPrefix,
} from "./CustomTokensComponents"

const Form = styled.form`
  ${commonFormStyle}
`

type FormData = Pick<
  CustomErc20TokenCreate,
  "evmNetworkId" | "contractAddress" | "symbol" | "decimals"
>

export const CustomTokenAdd = () => {
  const navigate = useNavigate()
  const networks = useSortedEvmNetworks()
  const [error, setError] = useState<string>()

  // our only user inputs are chain and contract
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
        })
        .required(),
    [networks]
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    resetField,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const { contractAddress, evmNetworkId, symbol, decimals } = watch()
  const {
    isLoading,
    error: tokenInfoError,
    token: tokenInfo,
  } = useErc20TokenInfo(evmNetworkId!, contractAddress)

  const handleNetworkChange = useCallback(
    (id: number) => {
      setValue("evmNetworkId", id, { shouldValidate: true })
    },
    [setValue]
  )

  // Keeping symbol and decimal fields bound to the form in case we want to make them editable later
  useEffect(() => {
    if (!tokenInfo) {
      resetField("decimals")
      resetField("symbol")
    } else {
      // force values fetched from blockchain
      setValue("symbol", tokenInfo?.symbol, { shouldValidate: true })
      setValue("decimals", tokenInfo?.decimals, { shouldValidate: true })
    }
  }, [decimals, resetField, setValue, symbol, tokenInfo])

  const submit = useCallback(
    async (token: FormData) => {
      try {
        assert(tokenInfo, "Missing token info")
        assert(tokenInfo.contractAddress === token.contractAddress, "Token mismatch")
        assert(tokenInfo.evmNetworkId === token.evmNetworkId, "Token mismatch")
        // save the object composed with CoinGecko and chain data
        await api.addCustomErc20Token(tokenInfo)
        navigate("/")
      } catch (err) {
        setError(`Failed to add the token : ${(err as Error)?.message ?? ""}`)
      }
    },
    [navigate, tokenInfo]
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
        <FormField
          label="Contract Address"
          error={
            errors.contractAddress ??
            (tokenInfoError && {
              type: "validate",
              message: "Invalid address",
            })
          }
          suffix={isLoading && <LoadingSuffix />}
        >
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
          <FormField
            label="Symbol"
            error={errors.symbol}
            prefix={tokenInfo && <SymbolPrefix token={tokenInfo} />}
          >
            <input
              {...register("symbol")}
              type="text"
              placeholder="ABC"
              autoComplete="off"
              disabled
            />
          </FormField>
          <FormField label="Decimals" error={errors.decimals}>
            <input
              {...register("decimals", {
                valueAsNumber: true,
              })}
              type="number"
              placeholder="0"
              autoComplete="off"
              disabled
            />
          </FormField>
        </Split>
        <ErrorDiv>{error}</ErrorDiv>
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
