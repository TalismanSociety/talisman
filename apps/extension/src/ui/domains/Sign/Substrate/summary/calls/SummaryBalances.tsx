import { PolkadotCalls } from "@polkadot-api/descriptors"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Address } from "extension-core"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { useChain, useToken } from "@ui/state"
import { ScaleApi } from "@ui/util/scaleApi"

import { DecodedCallSummaryComponent, DecodedCallSummaryComponentDefs } from "../../types"
import { getAddressFromMultiAddress } from "../../util/getAddressFromMultiAddress"
import { SummaryAddressDisplay } from "../shared/SummaryAddressDisplay"
import {
  SummaryAlert,
  SummaryContainer,
  SummaryContent,
  SummarySeparator,
} from "../shared/SummaryContainer"
import { SummaryLineBreak } from "../shared/SummaryLineBreak"
import { SummaryTokensAndFiat } from "../shared/SummaryTokensAndFiat"
import { SummaryTokenSymbolDisplay } from "../shared/SummaryTokenSymbolDisplay"

const TransferKeepAlive: DecodedCallSummaryComponent<
  PolkadotCalls["Balances"]["transfer_keep_alive"]
> = ({ decodedCall, sapi, mode }) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  const target = useMemo(() => {
    return getAddressFromMultiAddress(decodedCall.args.dest)
  }, [decodedCall.args.dest])

  const ed = useMemo(() => {
    return sapi.getConstant("Balances", "ExistentialDeposit") as bigint
  }, [sapi])

  if (!chain?.nativeToken?.id || !target) throw new Error("Missing data")

  if (mode !== "block")
    return (
      <Trans
        t={t}
        components={{
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} mode={mode} />,
          LineBreak: <SummaryLineBreak mode={mode} />,
          Tokens: (
            <SummaryTokensAndFiat
              tokenId={chain?.nativeToken?.id}
              planck={decodedCall.args.value}
              mode={mode}
            />
          ),
        }}
        defaults="Transfer <Tokens /><LineBreak /> to <Target />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Target: <SummaryAddressDisplay address={target} networkId={chain.id} mode={mode} />,
            Tokens: (
              <SummaryTokensAndFiat
                tokenId={chain?.nativeToken?.id}
                planck={decodedCall.args.value}
                mode={mode}
              />
            ),
          }}
          defaults="Transfer <Tokens /><br/> to <Target />"
        />
      </SummaryContent>
      <SummarySeparator />
      <SummaryAlert>
        <Trans
          t={t}
          components={{
            Tokens: (
              <SummaryTokensAndFiat tokenId={chain.nativeToken.id} planck={ed} mode={mode} noFiat />
            ),
          }}
          defaults="Transaction will revert if sender balance goes below the <Tokens /> existential deposit"
        />
      </SummaryAlert>
    </SummaryContainer>
  )
}

const TransferAllowDeath: DecodedCallSummaryComponent<
  PolkadotCalls["Balances"]["transfer_allow_death"]
> = ({ decodedCall, sapi, mode }) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  const target = useMemo(() => {
    return getAddressFromMultiAddress(decodedCall.args.dest)
  }, [decodedCall.args.dest])

  const ed = useMemo(() => {
    return sapi.getConstant("Balances", "ExistentialDeposit") as bigint
  }, [sapi])

  if (!chain?.nativeToken?.id || !target) throw new Error("Missing data")

  if (mode !== "block")
    return (
      <Trans
        t={t}
        components={{
          Tokens: (
            <SummaryTokensAndFiat
              tokenId={chain?.nativeToken?.id}
              planck={decodedCall.args.value}
              mode={mode}
            />
          ),
          LineBreak: <SummaryLineBreak mode={mode} />,
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} mode={mode} />,
        }}
        defaults="Transfer <Tokens /><LineBreak /> to <Target />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Target: <SummaryAddressDisplay address={target} networkId={chain.id} mode={mode} />,
            Tokens: (
              <SummaryTokensAndFiat
                tokenId={chain?.nativeToken?.id}
                planck={decodedCall.args.value}
                mode={mode}
              />
            ),
          }}
          defaults="Transfer <Tokens /><br/> to <Target />"
        />
      </SummaryContent>
      <SummarySeparator />
      <SummaryAlert>
        <Trans
          t={t}
          components={{
            Tokens: (
              <SummaryTokensAndFiat tokenId={chain.nativeToken.id} planck={ed} mode={mode} noFiat />
            ),
          }}
          defaults="If this causes the sender balance goes below the <Tokens /> existential deposit, the remaining balance will be lost and account will be removed from chain state."
        />
      </SummaryAlert>
    </SummaryContainer>
  )
}

const TransferAll: DecodedCallSummaryComponent<PolkadotCalls["Balances"]["transfer_all"]> = ({
  decodedCall,
  sapi,
  payload,
  mode,
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

  if (mode !== "block")
    return (
      <Trans
        t={t}
        components={{
          Symbol: <SummaryTokenSymbolDisplay tokenId={chain.nativeToken.id} />,
          LineBreak: <SummaryLineBreak mode={mode} />,
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} mode={mode} />,
        }}
        defaults="Transfer all <Symbol /><LineBreak /> to <Target />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Target: <SummaryAddressDisplay address={target} networkId={chain.id} mode={mode} />,
            Symbol: <SummaryTokenSymbolDisplay tokenId={chain.nativeToken.id} />,
          }}
          defaults="Transfer all available <Symbol /><br/> to <Target />"
        />
      </SummaryContent>
      <SummarySeparator />
      <SummaryContent className="pb-0 text-xs">
        <Trans
          t={t}
          components={{
            Tokens: (
              <SummaryTokensAndFiat
                planck={transferable}
                tokenId={chain.nativeToken.id}
                mode={mode}
              />
            ),
          }}
          defaults="Expected transfer: <Tokens />"
        />
      </SummaryContent>
      <SummaryAlert>
        {decodedCall.args.keep_alive ? (
          <Trans
            t={t}
            components={{
              Tokens: (
                <SummaryTokensAndFiat
                  tokenId={chain.nativeToken.id}
                  planck={ed}
                  mode={mode}
                  noFiat
                />
              ),
            }}
            defaults="Sender account will keep <Tokens /> as existential deposit."
          />
        ) : (
          t(
            "This may remove the sender account from the chain state if it doesn't own any other sufficient assets.",
          )
        )}
      </SummaryAlert>
    </SummaryContainer>
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

export const SUMMARY_COMPONENTS_BALANCES: DecodedCallSummaryComponentDefs = [
  ["Balances", "transfer_keep_alive", TransferKeepAlive],
  ["Balances", "transfer_allow_death", TransferAllowDeath],
  ["Balances", "transfer_all", TransferAll],
]
