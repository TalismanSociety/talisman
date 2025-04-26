import { BittensorBondFormBase } from "../BittensorBondFormBase"

export const BittensorSubnetBondForm = () => {
  const SubnetStakeDetails = () => {
    return <div>Subnet deets</div>
  }
  return <BittensorBondFormBase BondTypeDetails={SubnetStakeDetails} />
}
