import { SubstrateLayout } from "../shared/SubstrateLayout"
import { InvalidMetadata } from "./InvalidMetadata"

export const MiscPage = () => {
  return (
    <SubstrateLayout title="Metadata">
      <InvalidMetadata />
    </SubstrateLayout>
  )
}
