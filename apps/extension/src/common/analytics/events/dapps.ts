import { z } from "zod/v4"

import { properties } from "../properties"
import { defineEventGroup } from "../schema"

/** What a dapp can see and do once the user decided, beyond the request itself (dappRequests.ts). */
export const dappEvents = defineEventGroup(properties, {
  dapp_connection_approved: {
    description:
      "The user connected accounts to a dapp, from its connection or Solana sign-in request. A rejection is dapp_request_resolved with method connect.",
    props: {
      method: { narrow: z.enum(["connect", "signIn"]) },
      platform: "required",
      account_count: "required",
      dapp_domain: "required",
    },
  },
  dapp_connection_updated: {
    description:
      "The user changed which accounts a connected dapp can see, from the popup or the connected sites settings.",
    props: { platform: "required", account_count: "required", dapp_domain: "required" },
  },
  dapp_network_switched: {
    description: "The user picked another Ethereum network for a connected dapp.",
    props: { network_id: "required", dapp_domain: "required" },
  },
  dapp_connection_forgotten: {
    description:
      "The user forgot a connected site for one platform in settings: the dapp must ask to connect again.",
    props: { platform: "required", dapp_domain: "required" },
  },
  dapp_connections_forgotten: {
    description:
      "The user forgot every connected site of one platform in settings, Talisman's own web app aside.",
    props: { platform: "required", site_count: "required" },
  },
  dapp_connections_disconnected: {
    description:
      "The user disconnected every account from every connected site of one platform in settings. The sites stay listed.",
    props: { platform: "required", site_count: "required" },
  },
  phishing_site_trusted: {
    description:
      "The user chose to continue to a site the wallet had blocked as malicious, which allows it from then on.",
    props: { protection_source: "required" },
  },
  risk_warning_bypassed: {
    description:
      "The user chose Proceed anyway on the critical risk screen of a request the risk scan flagged as malicious, to review it.",
    props: { platform: { narrow: z.enum(["ethereum", "solana"]) } },
  },
})
