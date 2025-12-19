import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorBondFollowUp } from "../BittensorBondFollowUp"
import { BittensorRootBondForm } from "./BittensorRootBondForm"
import { BittensorRootBondReview } from "./BittensorRootBondReview"
import { BittensorStakingPositionSelect } from "./BittensorStakingPositionSelect"
import { BittensorSubnetBondForm } from "./BittensorSubnetBondForm"
import { BittensorSubnetBondReview } from "./BittensorSubnetBondReview"
import { BittensorSubnetSelect } from "./BittensorSubnetSelect"
import { BittensorValidatorSelect } from "./BittensorValidatorSelect"

export const BittensorBondModalRouter = () => {
  const { step, stakeType } = useBittensorBondWizard()

  switch (step) {
    case "form":
      return stakeType === "subnet" ? <BittensorSubnetBondForm /> : <BittensorRootBondForm />
    case "select-delegate":
      return <BittensorValidatorSelect />
    case "select-subnet":
      return <BittensorSubnetSelect />
    case "select-position":
      return <BittensorStakingPositionSelect />
    case "review":
      return stakeType === "subnet" ? <BittensorSubnetBondReview /> : <BittensorRootBondReview />
    case "follow-up":
      return <BittensorBondFollowUp />
  }
}
