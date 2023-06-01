import { log } from "@core/log"
import { TransactionInfo } from "@core/util/getEthTransactionInfo"
import { ErrorBoundary, FallbackRender } from "@sentry/react"
import { FC } from "react"

import { SignViewBodyShimmer } from "../Views/SignViewBodyShimmer"
import { EthSignBodyDefault } from "./EthSignBodyDefault"
import { EthSignBodyErc20Approve } from "./EthSignBodyErc20Approve"
import { EthSignBodyErc20Transfer } from "./EthSignBodyErc20Transfer"
import { EthSignBodyErc721Approve } from "./EthSignBodyErc721Approve"
import { EthSignBodyErc721ApproveAll } from "./EthSignBodyErc721ApproveAll"
import { EthSignBodyErc721Transfer } from "./EthSignBodyErc721Transfer"
import { EthSignMoonStakingCancel } from "./EthSignMoonStakingCancel"
import { EthSignMoonStakingExecute } from "./EthSignMoonStakingExecute"
import { EthSignMoonStakingSetAutoCompound } from "./EthSignMoonStakingSetAutoCompound"
import { EthSignMoonStakingStake } from "./EthSignMoonStakingStake"
import { EthSignMoonStakingStakeLess } from "./EthSignMoonStakingStakeLess"
import { EthSignMoonStakingStakeMore } from "./EthSignMoonStakingStakeMore"
import { EthSignMoonStakingUnstake } from "./EthSignMoonStakingUnstake"
import { EthSignMoonVotingDelegate } from "./EthSignMoonVotingDelegate"
import { EthSignMoonVotingUndelegate } from "./EthSignMoonVotingUndelegate"
import { EthSignMoonVotingVote } from "./EthSignMoonVotingVote"
import { EthSignMoonXTokensTransfer } from "./EthSignMoonXTokensTransfer"

type EthSignBodyProps = {
  transactionInfo?: TransactionInfo
  isReady: boolean
}

const getComponentFromKnownContractCall = (transactionInfo: TransactionInfo) => {
  const { contractType, contractCall } = transactionInfo

  // TODO REMOVE THIS BEFORE PR REVIEW
  log.debug(`${contractType}.${contractCall?.name}`, { contractType, contractCall })

  switch (`${contractType}.${contractCall?.name}`) {
    case "ERC20.transfer":
    case "ERC20.transferFrom":
      return EthSignBodyErc20Transfer
    case "ERC20.approve":
      return EthSignBodyErc20Approve
    case "ERC721.setApprovalForAll":
      return EthSignBodyErc721ApproveAll
    case "ERC721.approve":
      return EthSignBodyErc721Approve
    case "ERC721.transferFrom":
    case "ERC721.safeTransferFrom":
      return EthSignBodyErc721Transfer
    case "MoonStaking.delegateWithAutoCompound":
      return EthSignMoonStakingStake
    case "MoonStaking.delegatorBondMore":
      return EthSignMoonStakingStakeMore
    case "MoonStaking.scheduleDelegatorBondLess":
      return EthSignMoonStakingStakeLess
    case "MoonStaking.setAutoCompound":
      return EthSignMoonStakingSetAutoCompound
    case "MoonStaking.scheduleRevokeDelegation":
      return EthSignMoonStakingUnstake
    case "MoonStaking.executeDelegationRequest":
      return EthSignMoonStakingExecute
    case "MoonStaking.cancelDelegationRequest":
      return EthSignMoonStakingCancel
    case "MoonConvictionVoting.voteYes":
    case "MoonConvictionVoting.voteNo":
      return EthSignMoonVotingVote
    case "MoonConvictionVoting.delegate":
      return EthSignMoonVotingDelegate
    case "MoonConvictionVoting.undelegate":
      return EthSignMoonVotingUndelegate
    case "MoonXTokens.transfer":
      return EthSignMoonXTokensTransfer
    default:
      return null
  }
}

const Fallback: FallbackRender = () => <EthSignBodyDefault />

export const EthSignBody: FC<EthSignBodyProps> = ({ transactionInfo, isReady }) => {
  if (!isReady || !transactionInfo) return <SignViewBodyShimmer />

  const Component = getComponentFromKnownContractCall(transactionInfo)

  if (Component)
    return (
      <ErrorBoundary fallback={Fallback}>
        <Component />
      </ErrorBoundary>
    )

  return <EthSignBodyDefault />
}
