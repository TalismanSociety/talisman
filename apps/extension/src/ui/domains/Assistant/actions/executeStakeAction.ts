import { getScaleApi, type ScaleApi } from "@talismn/sapi"
import { api } from "@ui/api"
import { getAccountByAddress$ } from "@ui/state/accounts"
import { getNetworkByGenesisHash$, getNetworkById$, getToken$ } from "@ui/state/chaindata"
import { getMetadataRpcFromDef, type WalletTransactionInfo } from "extension-core"
import { firstValueFrom } from "rxjs"
import { ROOT_NETUID, TALISMAN_FEE_BITTENSOR } from "../../Staking/Bittensor/utils/constants"
import {
  getBittensorStakingPayload,
  getLimitPrice,
  getSwapSimulation,
} from "../../Staking/Bittensor/utils/helpers"
import { getNomPoolStakingPayload } from "../../Staking/helpers"
import type { PendingAction } from "../types"
import type { ExecutionResult, StakeActionParams, StakingData } from "./types"

const HARDWARE_WALLET_TYPES = ["ledger-ethereum", "ledger-polkadot", "ledger-solana", "qr"]

/**
 * Creates a ScaleApi instance for a given network.
 * This allows us to build and submit substrate transactions outside of React hooks.
 */
async function getScaleApiForNetwork(
  networkId: string,
  genesisHash?: string
): Promise<ScaleApi | null> {
  // Get network info - try by ID first, then by genesis hash
  let network = await firstValueFrom(getNetworkById$(networkId, "polkadot"))
  if (!network && genesisHash) {
    network = await firstValueFrom(getNetworkByGenesisHash$(genesisHash as `0x${string}`))
  }

  if (!network) {
    return null
  }

  // Get the native token for this network
  const token = await firstValueFrom(getToken$(network.nativeTokenId))
  if (!token) {
    return null
  }

  // Get metadata from the API
  const metadataDef = await api.subChainMetadata(network.genesisHash)
  if (!metadataDef?.metadataRpc) {
    return null
  }

  const metadataRpc = getMetadataRpcFromDef(metadataDef)
  if (!metadataRpc) {
    return null
  }

  // Create the ScaleApi instance
  return getScaleApi(
    {
      chainId: network.id,
      send: (...args) => api.subSend(network.id, ...args),
      submit: api.subSubmit,
      submitWithBittensorMevShield: api.subSubmitWithBittensorMevShield,
    },
    metadataRpc,
    token,
    network.hasCheckMetadataHash,
    network.signedExtensions,
    network.registryTypes
  ) as ScaleApi
}

export const executeStakeAction = async (action: PendingAction): Promise<ExecutionResult> => {
  const params = action.params as StakeActionParams
  const { stakingData } = params

  if (!stakingData) {
    return {
      success: false,
      error: "Missing staking data. Please try again.",
    }
  }

  // Get the account to check if it's a hardware wallet
  const account = await firstValueFrom(getAccountByAddress$(stakingData.address))

  if (!account) {
    return {
      success: false,
      error: "Account not found. Please try again.",
    }
  }

  // Check for hardware wallet
  if (HARDWARE_WALLET_TYPES.includes(account.type)) {
    return {
      success: false,
      error:
        "Hardware wallet detected. Please use the main wallet interface to sign transactions with your hardware wallet.",
    }
  }

  try {
    switch (stakingData.stakingType) {
      case "nomination-pool":
        return await executeNominationPoolStake(stakingData, account)
      case "bittensor":
        return await executeBittensorStake(stakingData, account)
      case "liquid-staking":
        return await executeLiquidStake(stakingData, account)
      default:
        return {
          success: false,
          error: `Unsupported staking type: ${stakingData.stakingType}`,
        }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Staking transaction failed",
    }
  }
}

async function executeNominationPoolStake(
  stakingData: StakingData,
  // biome-ignore lint/suspicious/noExplicitAny: account type from extension-core
  _account: any
): Promise<ExecutionResult> {
  // Validate required fields
  if (!stakingData.poolId) {
    return {
      success: false,
      error: "Pool ID is required for nomination pool staking.",
    }
  }

  // Get ScaleApi instance
  const sapi = await getScaleApiForNetwork(stakingData.networkId, stakingData.genesisHash)
  if (!sapi) {
    return {
      success: false,
      error: "Failed to connect to the network. Please try again.",
    }
  }

  try {
    // Build the staking payload
    // isBondExtra: false = joining a new pool
    // withSetClaimPermission: true = auto-compound rewards
    const { payload } = await getNomPoolStakingPayload(
      sapi,
      stakingData.address,
      stakingData.poolId,
      BigInt(stakingData.planck),
      false, // isBondExtra - joining pool, not adding to existing stake
      true // withSetClaimPermission - enable auto-compound
    )

    // Build transaction info for tracking
    const txInfo: WalletTransactionInfo = {
      type: "transfer",
      tokenId: stakingData.tokenId,
      value: stakingData.planck,
      to: stakingData.address, // Staking to self
    }

    // Submit the transaction
    // Passing undefined for signature lets the extension handle signing internally for local accounts
    const { hash } = await sapi.submit(payload, undefined, txInfo)

    return {
      success: true,
      hash,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to stake to nomination pool",
    }
  }
}

async function executeBittensorStake(
  stakingData: StakingData,
  // biome-ignore lint/suspicious/noExplicitAny: account type from extension-core
  _account: any
): Promise<ExecutionResult> {
  // Validate required fields
  if (!stakingData.validatorAddress) {
    return {
      success: false,
      error: "Validator address (hotkey) is required for Bittensor staking.",
    }
  }

  // Get ScaleApi instance
  const sapi = await getScaleApiForNetwork(stakingData.networkId, stakingData.genesisHash)
  if (!sapi) {
    return {
      success: false,
      error: "Failed to connect to Bittensor network. Please try again.",
    }
  }

  try {
    const amount = BigInt(stakingData.planck)
    // Default to root network (netuid 0) for validator staking if not specified
    const netuid = typeof stakingData.poolId === "number" ? stakingData.poolId : ROOT_NETUID

    let priceLimit = 0n
    let talismanFee = 0n

    // For subnet staking (non-root), we need to calculate price limit and fees
    if (netuid !== ROOT_NETUID) {
      // Simulate the swap to get expected output
      const simulation = await getSwapSimulation(sapi, netuid, "taoToAlpha", amount)

      // Calculate price limit with 0.5% slippage tolerance
      priceLimit = getLimitPrice(simulation, "taoToAlpha", 0.005)

      // Calculate Talisman fee (percentage of the staked amount)
      talismanFee = (amount * BigInt(Math.round(TALISMAN_FEE_BITTENSOR * 10000))) / 10000n
      // talismanFee = 0n
    }

    // Build the staking payload
    const { payload } = await getBittensorStakingPayload({
      sapi,
      address: stakingData.address,
      hotkey: stakingData.validatorAddress,
      amount,
      priceLimit,
      netuid,
      talismanFee,
    })

    // Build transaction info for tracking
    const txInfo: WalletTransactionInfo = {
      type: "bittensor-staking",
      fromTokenId: stakingData.tokenId,
      toTokenId: stakingData.tokenId, // Same token for root staking
      fromAmount: stakingData.planck,
      toAmount: stakingData.planck, // Approximate for root staking
    }

    // Submit the transaction using MEV shield for Bittensor
    // The "bittensor-mev-shield" mode protects against MEV attacks on Bittensor
    const { hash } = await sapi.submit(payload, undefined, txInfo, "bittensor-mev-shield")

    return {
      success: true,
      hash,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to stake TAO",
    }
  }
}

async function executeLiquidStake(
  _stakingData: StakingData,
  // biome-ignore lint/suspicious/noExplicitAny: account type from extension-core
  _account: any
): Promise<ExecutionResult> {
  // Liquid staking (like Lido for ETH, Rocket Pool, Marinade for SOL) requires
  // specific smart contract interactions that are platform-dependent:
  // - ETH: Lido (stETH), Rocket Pool (rETH) - EVM contract interactions
  // - SOL: Marinade (mSOL) - Solana program interactions
  //
  // These are fundamentally different from Substrate-based staking and require
  // direct contract calls rather than extrinsic submissions.
  //
  // For now, we direct users to external providers or the DeFi ecosystem
  // where these protocols can be accessed through their native interfaces.

  return {
    success: false,
    error:
      "Liquid staking protocols (like Lido, Rocket Pool, or Marinade) require interacting with external smart contracts. " +
      "Please visit the protocol's official website directly, or use the Swap feature to trade for liquid staking tokens (stETH, rETH, mSOL).",
  }
}
