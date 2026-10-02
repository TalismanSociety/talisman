import { z } from "zod/v4"

import { SEARCH_SURFACES } from "../portfolio"
import { properties } from "../properties"
import { defineEventGroup } from "../schema"

/** Mobile's names. A token id holds a contract address, so the symbol and network name the token. */
export const portfolioEvents = defineEventGroup(properties, {
  token_details_opened: {
    description:
      "The user opened a token's details page from the portfolio list. network_id is absent when the page groups the symbol across several networks.",
    props: { symbol: "required", network_id: "optional" },
  },
  account_switched: {
    description:
      "The user picked what the portfolio shows: one account, a folder, or All Accounts. account_type is set for one account.",
    props: { selection: "required", account_type: "optional", accounts_total: "required" },
  },
  search_performed: {
    description:
      "The user settled on a search: unchanged for a second, or the list closed. Once per distinct search per visit, never its text.",
    props: {
      surface: { narrow: z.enum(SEARCH_SURFACES) },
      query_length: "required",
      result_count: "required",
    },
  },
  nft_collection_hidden_toggled: {
    description: "The user hid an NFT collection from the portfolio, or showed it again.",
    props: { hidden: "required" },
  },
  nft_favourite_toggled: {
    description: "The user marked an NFT as a favourite, or unmarked it.",
    props: { favourite: "required" },
  },
  nft_metadata_refreshed: {
    description:
      "The user asked to refresh an NFT's metadata, usually because its picture or details looked wrong, and the refresh succeeded.",
    props: {},
  },
  backup_reminder_snoozed: {
    description:
      "The user hid the reminder to back up a recovery phrase, with Remind me later or its close button, instead of backing up.",
    props: { session_only: "required" },
  },
})
