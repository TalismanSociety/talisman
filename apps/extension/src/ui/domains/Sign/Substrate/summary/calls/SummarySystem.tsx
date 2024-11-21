import { PolkadotCalls } from "@polkadot-api/descriptors"
import { isAscii } from "@talismn/util"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { DecodedCallSummaryComponent, DecodedCallSummaryComponentDefs } from "../../types"
import { SummaryContainer, SummaryContent } from "../shared/SummaryContainer"

const Remark: DecodedCallSummaryComponent<PolkadotCalls["System"]["remark"]> = ({
  decodedCall: { args },
  mode,
}) => {
  const { t } = useTranslation()

  const remark = useMemo(
    () => (isAscii(args.remark.asText()) ? args.remark.asText() : args.remark.asHex()),
    [args.remark],
  )

  if (mode !== "block")
    return (
      <Trans
        t={t}
        components={{ Remark: <span className="text-body">{remark}</span> }}
        defaults="Remark: <Remark />"
        values={{ remark }}
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Remark: <span className="text-body">{remark}</span>,
          }}
          defaults="Stores a remark on chain:<br /> <Remark />"
        />
      </SummaryContent>
    </SummaryContainer>
  )
}

const RemarkWithEvent: DecodedCallSummaryComponent<
  PolkadotCalls["System"]["remark_with_event"]
> = ({ decodedCall: { args }, mode }) => {
  const { t } = useTranslation()

  const remark = useMemo(
    () => (isAscii(args.remark.asText()) ? args.remark.asText() : args.remark.asHex()),
    [args.remark],
  )

  if (mode !== "block")
    return (
      <Trans
        t={t}
        components={{ Remark: <span className="text-body">{remark}</span> }}
        defaults="Remark with event: <Remark />"
        values={{ remark }}
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Remark: <span className="text-body">{remark}</span>,
          }}
          defaults="Stores a remark on chain and emits an event:<br /> <Remark />"
        />
      </SummaryContent>
    </SummaryContainer>
  )
}

export const SUMMARY_COMPONENTS_SYSTEM: DecodedCallSummaryComponentDefs = [
  ["System", "remark", Remark],
  ["System", "remark_with_event", RemarkWithEvent],
]
