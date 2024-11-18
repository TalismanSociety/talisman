import { useSuspenseQuery } from "@tanstack/react-query"
import { Address } from "extension-core"
import { PolkadotCalls } from "papi-descriptors"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { useChain, useToken } from "@ui/state"
import { ScaleApi } from "@ui/util/scaleApi"

import { DecodedCallComponent, DecodedCallComponentDefs } from "../../types"
import { getAddressFromMultiAddress } from "../../util/getAddressFromMultiAddress"
import { SummaryAddressDisplay } from "../shared/SummaryAddressDisplay"
import {
  SummaryAlert,
  SummaryContainer,
  SummaryContent,
  SummarySeparator,
} from "../shared/SummaryContainer"
import { SummaryTokensAndFiat } from "../shared/SummaryTokensAndFiat"
import { SummaryTokenSymbolDisplay } from "../shared/SummaryTokenSymbolDisplay"

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

  if (inline)
    return (
      <Trans
        t={t}
        components={{
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={true} />,
          Tokens: (
            <SummaryTokensAndFiat
              tokenId={chain?.nativeToken?.id}
              planck={decodedCall.args.value}
              withFiat={false}
            />
          ),
        }}
        defaults="Transfer <Tokens /> to <Target />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={false} />,
            Tokens: (
              <SummaryTokensAndFiat
                tokenId={chain?.nativeToken?.id}
                planck={decodedCall.args.value}
                withFiat
              />
            ),
          }}
          defaults="Transfer <Tokens /> to <Target />"
        />
      </SummaryContent>
      <SummarySeparator />
      <SummaryAlert>
        <Trans
          t={t}
          components={{
            Tokens: (
              <SummaryTokensAndFiat tokenId={chain.nativeToken.id} planck={ed} withFiat={false} />
            ),
          }}
          defaults="Transaction will revert if sender balance goes below the <Tokens /> existential deposit"
        />
      </SummaryAlert>
    </SummaryContainer>
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

  if (inline)
    return (
      <Trans
        t={t}
        components={{
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={true} />,
          Tokens: (
            <SummaryTokensAndFiat
              tokenId={chain?.nativeToken?.id}
              planck={decodedCall.args.value}
              withFiat={false}
            />
          ),
        }}
        defaults="Transfer <Tokens /> to <Target />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={false} />,
            Tokens: (
              <SummaryTokensAndFiat
                tokenId={chain?.nativeToken?.id}
                planck={decodedCall.args.value}
                withFiat
              />
            ),
          }}
          defaults="Transfer <Tokens /> to <Target />"
        />
      </SummaryContent>
      <SummarySeparator />
      <SummaryAlert>
        <Trans
          t={t}
          components={{
            Tokens: (
              <SummaryTokensAndFiat tokenId={chain.nativeToken.id} planck={ed} withFiat={false} />
            ),
          }}
          defaults="If this causes the sender balance goes below the <Tokens /> existential deposit, the remaining balance will be lost and account will be removed from chain state."
        />
      </SummaryAlert>
    </SummaryContainer>
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

  if (inline)
    return (
      <Trans
        t={t}
        components={{
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={true} />,
          Symbol: <SummaryTokenSymbolDisplay tokenId={chain.nativeToken.id} />,
        }}
        defaults="Transfer all <Symbol /> to <Target />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={false} />,
            Symbol: <SummaryTokenSymbolDisplay tokenId={chain.nativeToken.id} />,
          }}
          defaults="Transfer all available <Symbol /><br/>to <Target />"
        />
      </SummaryContent>
      <SummarySeparator />
      <SummaryContent className="pb-0 text-xs">
        <Trans
          t={t}
          components={{
            Tokens: (
              <SummaryTokensAndFiat planck={transferable} tokenId={chain.nativeToken.id} withFiat />
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
                <SummaryTokensAndFiat tokenId={chain.nativeToken.id} planck={ed} withFiat={false} />
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

export const SUMMARY_COMPONENTS_BALANCES: DecodedCallComponentDefs = [
  ["Balances", "transfer_keep_alive", TransferKeepAlive],
  ["Balances", "transfer_allow_death", TransferAllowDeath],
  ["Balances", "transfer_all", TransferAll],
]
