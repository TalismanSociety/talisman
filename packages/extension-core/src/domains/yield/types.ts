export type YieldProduct = {
  id: string
  network: string
  inputTokens: Array<{
    address?: string
    symbol: string
    name: string
    decimals: number
    logoURI: string
    coinGeckoId?: string
    network: string
    isPoints: boolean
  }>
  token: {
    symbol: string
    name: string
    decimals: number
    logoURI: string
    coinGeckoId?: string
    network: string
    isPoints: boolean
  }
  rewardRate: {
    total: number
    rateType: string
    components: Array<{
      rate: number
      rateType: string
      token: {
        symbol: string
        name: string
        decimals: number
        logoURI: string
        coinGeckoId?: string
        network: string
        isPoints: boolean
      }
      yieldSource: string
      description: string
    }>
  }
  status: {
    enter: boolean
    exit: boolean
  }
  metadata: {
    name: string
    description: string
    documentation?: string
    logoURI: string
    underMaintenance: boolean
    deprecated: boolean
    supportedStandards: string[]
  }
  mechanics: {
    type: string
    requiresValidatorSelection: boolean
    rewardSchedule: string
    rewardClaiming: string
    gasFeeToken: {
      symbol: string
      name: string
      decimals: number
      logoURI: string
      coinGeckoId?: string
      network: string
      isPoints: boolean
    }
    cooldownPeriod?: {
      seconds: number
    }
    entryLimits: {
      minimum: string
      maximum: string | null
    }
    supportsLedgerWalletApi: boolean
    arguments: {
      enter: {
        fields: Array<{
          name: string
          type: string
          label: string
          description: string
          required: boolean
          placeholder: string
          minimum?: string
          maximum?: string | null
          isArray: boolean
          options?: string[]
        }>
      }
      exit: {
        fields: Array<{
          name: string
          type: string
          label: string
          description: string
          required: boolean
          placeholder: string
          minimum?: string
          maximum?: string | null
          isArray: boolean
        }>
      }
    }
    possibleFeeTakingMechanisms: {
      depositFee: boolean
      managementFee: boolean
      performanceFee: boolean
      validatorRebates: boolean
    }
  }
  providerId: string
  outputToken: {
    address: string
    symbol: string
    name: string
    decimals: number
    logoURI: string
    network: string
    isPoints: boolean
  }
  tags: string[]
}

export type YieldProductsFilter = {
  tokenId?: string
  tokenSymbol?: string
  networkName?: string
  protocolIds?: string[]
}
