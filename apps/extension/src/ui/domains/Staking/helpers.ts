import { StakingSupportedChain } from "@core/domains/staking/types"

type Colours = {
  text: string
  background: string
}

export const colours: Record<StakingSupportedChain, Colours> = {
  "polkadot": {
    text: "text-[#cc2c75]",
    background: "bg-[#260001]",
  },
  "kusama": {
    text: "text-body-secondary",
    background: "bg-[#303030]",
  },
  "aleph-zero": {
    text: "text-[#e5ff57]",
    background: "bg-[#2C2D30]",
  },
  "vara": {
    text: "text-[#00a87a]",
    background: "bg-[#002905]",
  },
  "1": {
    text: "text-[#8b93b4]",
    background: "bg-[#151C2F]",
  },
}
