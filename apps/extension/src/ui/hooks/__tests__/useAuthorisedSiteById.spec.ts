import { TALISMAN_WEB_APP_DOMAIN } from "@core/constants"
import { AuthorizedSiteId, ProviderType } from "@core/domains/sitesAuthorised/types"
import { act, renderHook, waitFor } from "@testing-library/react"

import { ADDRESSES } from "../../../../tests/constants"
import useAuthorisedSiteById from "../useAuthorisedSiteById"

type RenderProps = { siteId: AuthorizedSiteId; providerType: ProviderType }

test("Can get Authorised Site by id", async () => {
  const { result, rerender } = renderHook(
    (props: RenderProps) => useAuthorisedSiteById(props.siteId, props.providerType),
    {
      initialProps: { siteId: TALISMAN_WEB_APP_DOMAIN, providerType: "polkadot" },
    }
  )

  expect(result.current.addresses?.length).toBe(2)
  expect(result.current.connectAllSubstrate).toBe(true)

  expect(result.current.availableAddresses).toStrictEqual(Object.values(ADDRESSES))

  await act(async () => result.current.toggleOne(ADDRESSES.GAV))
  waitFor(() => expect(result.current.addresses?.length).toBe(1))

  await act(async () => result.current.toggleAll(false))
  waitFor(() => expect(result.current.addresses?.length).toBe(0))

  await act(async () => result.current.toggleAll(true))
  waitFor(() => expect(result.current.addresses?.length).toBe(3))

  rerender({ siteId: "app.stellaswap.com", providerType: "ethereum" })
  expect(result.current.addresses).toBeUndefined()
  expect(result.current.ethAddresses?.length).toBe(1)
  expect(result.current.connectAllSubstrate).toBeUndefined()

  expect(result.current.availableAddresses).toStrictEqual([ADDRESSES.VITALIK])
  await act(async () => result.current.setEthChainId(12))
  waitFor(() => expect(result.current.ethChainId).toBe(12))
})
