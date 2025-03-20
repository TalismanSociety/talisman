import { FC, Fragment, useMemo } from "react"

import { Address } from "@ui/domains/Account/Address"

const ETHEREUM_ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/g

export const RiskAnalysisDescription: FC<{ text: string }> = ({ text }) => {
  const [parts, matches] = useMemo(() => {
    return [text.split(ETHEREUM_ADDRESS_REGEX), text.match(ETHEREUM_ADDRESS_REGEX) || []]
  }, [text])

  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {matches[index] && (
            <Address address={matches[index]} startCharCount={8} endCharCount={6} />
          )}
        </Fragment>
      ))}
    </>
  )
}
