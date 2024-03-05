import { ErrorBoundary, FallbackRender } from "@sentry/react"
import { DecodedEvmTransaction } from "@ui/domains/Ethereum/util/decodeEvmTransaction"
import { FC } from "react"

import { SignViewBodyShimmer } from "../Views/SignViewBodyShimmer"
import { EthSignMoonVotingDelegate } from "./convictionVoting/EthSignMoonVotingDelegate"
import { EthSignMoonVotingUndelegate } from "./convictionVoting/EthSignMoonVotingUndelegate"
import { EthSignMoonVotingVote } from "./convictionVoting/EthSignMoonVotingVote"
import { EthSignBodyDefault } from "./EthSignBodyDefault"
import { EthSignBodyErc20Approve } from "./EthSignBodyErc20Approve"
import { EthSignBodyErc20Transfer } from "./EthSignBodyErc20Transfer"
import { EthSignBodyErc721Approve } from "./EthSignBodyErc721Approve"
import { EthSignBodyErc721ApproveAll } from "./EthSignBodyErc721ApproveAll"
import { EthSignBodyErc721Transfer } from "./EthSignBodyErc721Transfer"
import { EthSignMoonStakingCancel } from "./staking/EthSignMoonStakingCancel"
import { EthSignMoonStakingExecute } from "./staking/EthSignMoonStakingExecute"
import { EthSignMoonStakingSetAutoCompound } from "./staking/EthSignMoonStakingSetAutoCompound"
import { EthSignMoonStakingStake } from "./staking/EthSignMoonStakingStake"
import { EthSignMoonStakingStakeLess } from "./staking/EthSignMoonStakingStakeLess"
import { EthSignMoonStakingStakeMore } from "./staking/EthSignMoonStakingStakeMore"
import { EthSignMoonStakingUnstake } from "./staking/EthSignMoonStakingUnstake"
import { EthSignMoonXTokensTransfer } from "./xTokens/EthSignMoonXTokensTransfer"

type EthSignBodyProps = {
  decodedTx?: DecodedEvmTransaction | null
  isReady: boolean
}

const getComponentFromKnownContractCall = (decodedTx: DecodedEvmTransaction) => {
  const { contractType, contractCall } = decodedTx

  switch (`${contractType}.${contractCall?.functionName}`) {
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

export const EthSignBody: FC<EthSignBodyProps> = ({ decodedTx, isReady }) => {
  if (!isReady || !decodedTx) return <SignViewBodyShimmer />

  const Component = getComponentFromKnownContractCall(decodedTx)

  if (Component)
    return (
      <ErrorBoundary fallback={Fallback}>
        <Component />
      </ErrorBoundary>
    )

  return <EthSignBodyDefault />
}
