import { PolkadotCalls } from "papi-descriptors"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useChain } from "@ui/state"

import { DecodedCallComponent, DecodedCallComponentDefs } from "../../types"
import { getAddressFromMultiAddress } from "../../util/getAddressFromMultiAddress"
import { SummaryAddressDisplay } from "../shared/SummaryAddressDisplay"
import { SummaryContainer } from "../shared/SummaryContainer"

const TransferKeepAlive: DecodedCallComponent<PolkadotCalls["Balances"]["transfer_keep_alive"]> = ({
  decodedCall,
  sapi,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  const target = useMemo(() => {
    return getAddressFromMultiAddress(decodedCall.args.dest)
  }, [decodedCall.args.dest])

  const ed = useMemo(() => {
    return sapi.getConstant("Balances", "ExistentialDeposit") as bigint
  }, [sapi])

  if (!chain?.nativeToken?.id || !target) return null

  return (
    <SummaryContainer>
      <Trans
        t={t}
        components={{
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} />,
          Tokens: (
            <TokensAndFiat
              tokenId={chain?.nativeToken?.id}
              planck={decodedCall.args.value}
              noCountUp
              className="font-bold"
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          ),
        }}
        defaults="Transfer <Tokens /> to <Target />"
      />
      <div className="h-4"></div>
      <Trans
        t={t}
        components={{
          Tokens: (
            <TokensAndFiat
              noFiat
              planck={ed}
              tokenId={chain.nativeToken.id}
              noCountUp
              className="text-body"
            />
          ),
        }}
        defaults="Transaction will revert if sender balance goes below the <Tokens /> existential deposit"
      />
    </SummaryContainer>
  )
}

export const SUMMARY_COMPONENTS_BALANCES: DecodedCallComponentDefs = [
  ["Balances", "transfer_keep_alive", TransferKeepAlive],
]
