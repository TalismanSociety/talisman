import { useSuspenseQuery } from "@tanstack/react-query"
import { Address } from "extension-core"
import { PolkadotCalls } from "papi-descriptors"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useChain, useToken } from "@ui/state"
import { ScaleApi } from "@ui/util/scaleApi"

import { DecodedCallComponent, DecodedCallComponentDefs } from "../../types"
import { getAddressFromMultiAddress } from "../../util/getAddressFromMultiAddress"
import { SummaryAddressDisplay } from "../shared/SummaryAddressDisplay"

const TransferKeepAlive: DecodedCallComponent<PolkadotCalls["Balances"]["transfer_keep_alive"]> = ({
  decodedCall,
  sapi,
  inline,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  const target = useMemo(() => {
    return getAddressFromMultiAddress(decodedCall.args.dest)
  }, [decodedCall.args.dest])

  const ed = useMemo(() => {
    return sapi.getConstant("Balances", "ExistentialDeposit") as bigint
  }, [sapi])

  if (!chain?.nativeToken?.id || !target) throw new Error("Missing data")

  return (
    <>
      <Trans
        t={t}
        components={{
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={!!inline} />,
          Tokens: (
            <TokensAndFiat
              tokenId={chain?.nativeToken?.id}
              planck={decodedCall.args.value}
              noCountUp
              className="whitespace-nowrap font-bold"
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          ),
        }}
        defaults="Transfer <Tokens /> to <Target />"
      />
      {!inline && (
        <div className="mt-4">
          <Trans
            t={t}
            components={{
              Tokens: (
                <TokensAndFiat
                  noFiat
                  planck={ed}
                  tokenId={chain.nativeToken.id}
                  noCountUp
                  className="text-body font-bold"
                />
              ),
            }}
            defaults="Transaction will revert if sender balance goes below the <Tokens /> existential deposit"
          />
        </div>
      )}
    </>
  )
}

const TransferAllowDeath: DecodedCallComponent<
  PolkadotCalls["Balances"]["transfer_allow_death"]
> = ({ decodedCall, sapi, inline }) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  const target = useMemo(() => {
    return getAddressFromMultiAddress(decodedCall.args.dest)
  }, [decodedCall.args.dest])

  const ed = useMemo(() => {
    return sapi.getConstant("Balances", "ExistentialDeposit") as bigint
  }, [sapi])

  if (!chain?.nativeToken?.id || !target) throw new Error("Missing data")

  return (
    <>
      <Trans
        t={t}
        components={{
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={!!inline} />,
          Tokens: (
            <TokensAndFiat
              tokenId={chain?.nativeToken?.id}
              planck={decodedCall.args.value}
              noCountUp
              className="whitespace-nowrap font-bold"
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          ),
        }}
        defaults="Transfer <Tokens /> to <Target />"
      />
      {!inline && (
        <div className="mt-4 text-left">
          <Trans
            t={t}
            components={{
              Tokens: (
                <TokensAndFiat
                  noFiat
                  planck={ed}
                  tokenId={chain.nativeToken.id}
                  noCountUp
                  className="text-body whitespace-nowrap font-bold"
                  fiatClassName="text-body-secondary"
                />
              ),
            }}
            defaults="If this causes the sender balance goes below the <Tokens /> existential deposit, the remaining balance will be lost and account will be removed from chain state."
          />
        </div>
      )}
    </>
  )
}

const TransferAll: DecodedCallComponent<PolkadotCalls["Balances"]["transfer_all"]> = ({
  decodedCall,
  sapi,
  payload,
  inline,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)
  const nativeToken = useToken(chain?.nativeToken?.id)

  const target = useMemo(() => {
    return getAddressFromMultiAddress(decodedCall.args.dest)
  }, [decodedCall.args.dest])

  const ed = useMemo(() => {
    return sapi.getConstant("Balances", "ExistentialDeposit") as bigint
  }, [sapi])

  const { data: account } = useSystemAccount(sapi, payload.address)

  const transferable = useMemo(() => {
    if (!account) return null
    const transferable = account.data.free - account.data.frozen
    const keepAlive = decodedCall.args.keep_alive ? ed : 0n
    return transferable > keepAlive ? transferable - keepAlive : 0n
  }, [account, decodedCall.args.keep_alive, ed])

  if (!chain?.nativeToken?.id || !nativeToken || !account || transferable === null)
    throw new Error("Missing data")

  return (
    <>
      <Trans
        t={t}
        components={{
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={!!inline} />,
          Symbol: <span className="text-body font-bold">{nativeToken.symbol}</span>,
        }}
        defaults="Transfer all available <Symbol /> to <Target />"
      />
      {!inline && (
        <>
          <div className="mt-8 text-left [button>&]:hidden">
            {decodedCall.args.keep_alive ? (
              <Trans
                t={t}
                components={{
                  Tokens: (
                    <TokensAndFiat
                      noFiat
                      planck={ed}
                      tokenId={chain.nativeToken.id}
                      noCountUp
                      fiatClassName="text-body-secondary"
                      className="text-body whitespace-nowrap font-bold"
                    />
                  ),
                  Symbol: <span className="text-body font-bold">{nativeToken.symbol}</span>,
                }}
                defaults="Sender account will keep <Tokens /> as existential deposit."
              />
            ) : (
              t(
                "This may remove the sender account from the chain state if it doesn't own any other sufficient assets.",
              )
            )}
          </div>
          <div className="mt-4 text-left [button>&]:hidden">
            <Trans
              t={t}
              components={{
                Tokens: (
                  <TokensAndFiat
                    planck={transferable}
                    tokenId={chain.nativeToken.id}
                    noCountUp
                    className="text-body whitespace-nowrap font-bold"
                    fiatClassName="text-body-secondary"
                  />
                ),
              }}
              defaults="Expected transfer: <Tokens />"
            />
          </div>
        </>
      )}
    </>
  )
}

const useSystemAccount = (sapi: ScaleApi, address: Address) =>
  useSuspenseQuery({
    queryKey: ["useSystemAccount", sapi?.id, address],
    queryFn: async () => {
      if (!sapi || !address) return null
      return sapi.getStorage<{
        sufficients: number
        data: { free: bigint; reserved: bigint; frozen: bigint }
      }>("System", "Account", [address])
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  })

export const SUMMARY_COMPONENTS_BALANCES: DecodedCallComponentDefs = [
  ["Balances", "transfer_keep_alive", TransferKeepAlive],
  ["Balances", "transfer_allow_death", TransferAllowDeath],
  ["Balances", "transfer_all", TransferAll],
]
