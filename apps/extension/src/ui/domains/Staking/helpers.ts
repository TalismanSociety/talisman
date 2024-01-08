import { StakingSupportedChain } from "@core/domains/staking/types"

type Colours = {
  text: string
  background: string
}

export const colours: Record<StakingSupportedChain, Colours> = {
  "polkadot": {
    text: "text-[#cc2c75]",
    background: "from-[#260001]",
  },
  "kusama": {
    text: "text-body-secondary",
    background: "from-[#303030]",
  },
  "aleph-zero": {
    text: "text-[#e5ff57]",
    background: "from-[#2C2D30]",
  },
  "vara": {
    text: "text-[#00a87a]",
    background: "from-[#002905]",
  },
  "1": {
    text: "text-[#8b93b4]",
    background: "from-[#151C2F]",
  },
}
