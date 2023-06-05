import { AccountPill } from "@ui/domains/Account/AccountPill"

import { usePolkadotSigningRequest } from "../SignRequestContext"
import { ViewDetails } from "../ViewDetails/ViewDetails"

export const SubSignBodyDefault = () => {
  const { account, chain } = usePolkadotSigningRequest()

  return (
    <div className="animate-fade-in flex grow flex-col">
      <h1>Approve Request</h1>
      <h2 className="center">
        You are approving a request with account{" "}
        <AccountPill account={account} prefix={chain?.prefix ?? undefined} />
        {chain ? ` on ${chain.name}` : null}
      </h2>
      <div className="mt-16">
        <ViewDetails />
      </div>
    </div>
  )
}
