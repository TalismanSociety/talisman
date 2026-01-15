import type { Tool } from "@anthropic-ai/sdk/resources/messages"

export const assistantTools: Tool[] = [
  // READ TOOLS - No confirmation required
  {
    name: "get_portfolio_summary",
    description:
      "Get a summary of the user's portfolio including total value, top holdings, and distribution across chains. Use this when the user asks about their holdings, portfolio, or balance overview.",
    input_schema: {
      type: "object" as const,
      properties: {
        include_small_balances: {
          type: "boolean",
          description: "Include tokens with very small balances (default: false)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_token_balance",
    description:
      "Get the balance of a specific token for the user. Use this when asking about a specific token amount.",
    input_schema: {
      type: "object" as const,
      properties: {
        token_symbol: {
          type: "string",
          description: "Token symbol (e.g., 'ETH', 'DOT', 'USDC')",
        },
        chain_id: {
          type: "string",
          description: "Optional: specific chain to check (e.g., 'ethereum', 'polkadot')",
        },
      },
      required: ["token_symbol"],
    },
  },
  {
    name: "get_swap_quote",
    description:
      "Get a quote for swapping one token for another. Returns available routes and estimated output. Use this before executing a swap.",
    input_schema: {
      type: "object" as const,
      properties: {
        from_token: {
          type: "string",
          description: "Token symbol to swap from",
        },
        to_token: {
          type: "string",
          description: "Token symbol to swap to",
        },
        amount: {
          type: "string",
          description: "Amount to swap (in token units, not wei)",
        },
        from_chain: {
          type: "string",
          description: "Optional: source chain",
        },
        to_chain: {
          type: "string",
          description: "Optional: destination chain",
        },
      },
      required: ["from_token", "to_token", "amount"],
    },
  },
  {
    name: "get_staking_options",
    description:
      "Get available staking opportunities for a token, including APY estimates and validators/pools.",
    input_schema: {
      type: "object" as const,
      properties: {
        token_symbol: {
          type: "string",
          description: "Token to stake (e.g., 'DOT', 'ETH', 'TAO')",
        },
      },
      required: ["token_symbol"],
    },
  },
  {
    name: "get_transaction_history",
    description: "Get recent transaction history for the user's accounts.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of transactions to return (default: 10)",
        },
        chain_id: {
          type: "string",
          description: "Optional: filter by specific chain",
        },
      },
      required: [],
    },
  },
  {
    name: "analyze_transaction",
    description:
      "Analyze and explain a specific transaction, including what happened and potential optimizations.",
    input_schema: {
      type: "object" as const,
      properties: {
        transaction_hash: {
          type: "string",
          description: "Transaction hash to analyze",
        },
      },
      required: ["transaction_hash"],
    },
  },
  {
    name: "get_gas_estimate",
    description: "Get estimated gas costs for an operation on a specific chain.",
    input_schema: {
      type: "object" as const,
      properties: {
        chain_id: {
          type: "string",
          description: "Chain to estimate gas for",
        },
        operation: {
          type: "string",
          enum: ["transfer", "swap", "stake"],
          description: "Type of operation",
        },
      },
      required: ["chain_id", "operation"],
    },
  },
  {
    name: "get_subnet_sentiment",
    description:
      "Get sentiment analysis for a specific Bittensor subnet. Analyzes social media mentions, sentiment trends, and provides a breakdown of bullish/bearish sentiment. Use this when the user asks about sentiment, social buzz, or community opinion for a Bittensor subnet.",
    input_schema: {
      type: "object" as const,
      properties: {
        netuid: {
          type: "number",
          description: "The subnet ID (netuid) to analyze sentiment for (e.g., 1, 8, 18)",
        },
        include_tweets: {
          type: "boolean",
          description:
            "Include recent tweet samples in the response (default: false). Set to true if the user wants to see specific social posts.",
        },
      },
      required: ["netuid"],
    },
  },

  // WRITE TOOLS - Require user confirmation
  {
    name: "execute_swap",
    description:
      "Execute a token swap. IMPORTANT: This will prompt the user for confirmation before executing. Always get a quote first using get_swap_quote.",
    input_schema: {
      type: "object" as const,
      properties: {
        from_token: {
          type: "string",
          description: "Token symbol to swap from",
        },
        to_token: {
          type: "string",
          description: "Token symbol to swap to",
        },
        amount: {
          type: "string",
          description: "Amount to swap",
        },
        from_chain: {
          type: "string",
          description: "Source chain",
        },
        to_chain: {
          type: "string",
          description: "Destination chain",
        },
        slippage: {
          type: "number",
          description: "Maximum slippage percentage (default: 0.5)",
        },
      },
      required: ["from_token", "to_token", "amount"],
    },
  },
  {
    name: "execute_stake",
    description:
      "Stake tokens with a validator or pool. IMPORTANT: This will prompt the user for confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        token_symbol: {
          type: "string",
          description: "Token to stake",
        },
        amount: {
          type: "string",
          description: "Amount to stake",
        },
        validator_address: {
          type: "string",
          description: "Optional: specific validator address",
        },
        pool_id: {
          type: "string",
          description: "Optional: staking pool identifier",
        },
      },
      required: ["token_symbol", "amount"],
    },
  },
  {
    name: "send_tokens",
    description:
      "Send tokens to another address. IMPORTANT: This will prompt the user for confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        token_symbol: {
          type: "string",
          description: "Token to send",
        },
        amount: {
          type: "string",
          description: "Amount to send",
        },
        to_address: {
          type: "string",
          description: "Recipient address",
        },
        chain_id: {
          type: "string",
          description: "Chain to send on",
        },
      },
      required: ["token_symbol", "amount", "to_address"],
    },
  },
  {
    name: "rebalance_portfolio",
    description:
      "Calculate and execute portfolio rebalancing to target allocations. IMPORTANT: This will prompt the user for confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        target_allocations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              token: { type: "string" },
              percentage: { type: "number" },
            },
          },
          description: "Target allocation percentages",
        },
        tolerance: {
          type: "number",
          description: "Percentage tolerance before rebalancing (default: 5)",
        },
      },
      required: ["target_allocations"],
    },
  },
]
