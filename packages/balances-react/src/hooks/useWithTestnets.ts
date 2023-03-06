import { provideContext } from "../util"

const useWithTestnetsProvider = ({ withTestnets }: { withTestnets?: boolean }) => {
  return { withTestnets }
}

export const [WithTestnetsProvider, useWithTestnets] = provideContext(useWithTestnetsProvider)
