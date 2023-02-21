import { useState } from "react"

import { provideContext } from "../util/provideContext"

const useAllAddressesProvider = () => useState<string[]>([])

export const [AllAddressesProvider, useAllAddresses] = provideContext(useAllAddressesProvider)
