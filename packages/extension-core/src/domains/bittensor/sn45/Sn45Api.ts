/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const responseToParse = responseFormat ? response.clone() : response;
      const data = !responseFormat
        ? r
        : await responseToParse[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title OpenAPI
 * @version 1.0.0
 */
export class Sn45Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  v1 = {
    /**
     * No description
     *
     * @tags Bittensor
     * @name GetTaoPrice
     * @summary Latest TAO USD price
     * @request GET:/v1/bittensor/tao-price
     */
    getTaoPrice: (params: RequestParams = {}) =>
      this.request<
        {
          price: string | null;
          timestamp: string | null;
          marketCap: number | null;
          volume24h: number | null;
          priceChange24h: number | null;
          priceChange7d: number | null;
          priceChange30d: number | null;
          marketCapChange24h: number | null;
          source: string | null;
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/tao-price`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Bittensor
     * @name GetWhaleMovements
     * @summary Large stake transactions (whale movements)
     * @request GET:/v1/bittensor/whales
     */
    getWhaleMovements: (
      query?: {
        minTao?: string;
        limit?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          method: "Adding" | "Removing";
          coldkey: string;
          coldkeyShort: string;
          netuid: number;
          taoAmount: number;
          alphaAmount: number;
          timestamp: string;
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/whales`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Bittensor
     * @name GetWhaleTransactions
     * @summary Get all whale stake transactions across all subnets
     * @request GET:/v1/bittensor/whale-transactions
     */
    getWhaleTransactions: (
      query?: {
        limit?: string;
        /** Filter by tier (Shrimp, Crab, Fish, Dolphin, Shark, Whale) */
        tier?: string;
        /** Filter by transaction type (StakeAdded, StakeRemoved, StakeMove, StakeTransfer, StakeSwapped) */
        transactionType?: string;
        /** Minimum TAO amount (in TAO, not rao) */
        minTaoAmount?: string;
        /** Filter by subnet ID */
        netuid?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          id: string;
          blockHeight: number;
          extrinsicIndex: number | null;
          transactionType:
            | "StakeAdded"
            | "StakeRemoved"
            | "StakeMove"
            | "StakeTransfer"
            | "StakeSwapped";
          tier: "Shrimp" | "Crab" | "Fish" | "Dolphin" | "Shark" | "Whale";
          coldkey: string;
          hotkey: string;
          netuid: number;
          originNetuid: number | null;
          taoAmount: string;
          alphaAmount: string | null;
          destinationColdkey: string | null;
          timestamp: string;
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/whale-transactions`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSubnetEconomicsList
     * @summary Economics data for subnets
     * @request GET:/v1/bittensor/subnets/economics
     */
    getSubnetEconomicsList: (params: RequestParams = {}) =>
      this.request<
        {
          netuid: number;
          price: number;
          volume: number;
          alphaIn: number;
          alphaOut: number;
          netAlpha: number;
          emaTaoFlow: number;
          economicScore: number;
          flowDirection: "inflow" | "outflow" | "neutral";
          timestamp: string;
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/economics`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Returns leaderboard rows for all subnets, combining trading activity, emission, sentiment, and derived velocity signals. Numeric amounts that can exceed safe JSON integer range are returned as string-encoded integers.
     *
     * @tags Subnets
     * @name GetSubnetLeaderboard
     * @summary Subnet leaderboard with model-enriched metrics
     * @request GET:/v1/bittensor/subnets/leaderboard
     */
    getSubnetLeaderboard: (
      query?: {
        /**
         * Leaderboard window. Accepted values: 1d (24h), 1w (7 days), 1m (30 days). Defaults to 1d.
         * @default "1d"
         */
        period?: "1d" | "1w" | "1m";
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Requested leaderboard window. Mirrors the `period` query parameter. */
          period: "1d" | "1w" | "1m";
          /** ISO timestamp indicating when leaderboard data was last refreshed. */
          updatedAt: string;
          /** Leaderboard rows for all subnets, sorted by descending composite score. */
          subnets: {
            /** Subnet identifier (netuid). */
            netuid: number;
            /** Latest subnet alpha price in TAO. Null when no recent price snapshot exists. */
            currentPrice: number | null;
            /** Percent price change over the requested period (e.g. 1d, 1w, 1m). */
            priceChange: number | null;
            /** Total TAO staked, in rao (1 TAO = 1e9 rao). String-encoded integer; may be null. */
            stakedTao: string | null;
            /** Total alpha staked for the subnet, in alpha rao units. String-encoded integer; may be null. */
            stakedAlpha: string | null;
            /** Total traded TAO volume during the requested period, in rao. String-encoded integer. */
            volume: string;
            /** Number of stake events (buy + sell) during the requested period. */
            txCount: number;
            /** Number of buy-side stake events during the requested period. */
            buyCount: number;
            /** Number of sell-side stake events during the requested period. */
            sellCount: number;
            /** Subnet market cap proxy, in rao-denominated units. String-encoded integer; may be null. */
            mcap: string | null;
            /** Alpha-out emission amount from latest emission snapshot, as string-encoded integer. */
            alphaOutEmission: string | null;
            /** Alpha-in emission amount from latest emission snapshot, as string-encoded integer. */
            alphaInEmission: string | null;
            /** TAO-in emission amount from latest emission snapshot, as string-encoded integer. */
            taoInEmission: string | null;
            /** Current number of unique holder wallets for the subnet. */
            totalHolders: number;
            /** Exponentially weighted moving average of TAO flow from leaderboard model output. String-encoded integer; may be null. */
            emaTaoFlow: string | null;
            /** EMA-based price ratio signal used by the ranking model. May be null. */
            emaPriceRatio: number | null;
            /** Emission percentage signal for the subnet, represented as percent value. */
            emissionPct: number | null;
            /** Seven-day price history series in TAO, ordered oldest to newest. Empty array when history is unavailable. */
            priceHistory7d: number[];
            /** Current subnet sentiment score merged into leaderboard model. May be null. */
            sentimentScore: number | null;
            /** Rate-of-change signal for sentiment used in leaderboard scoring. May be null. */
            sentimentVelocity: number | null;
            /** Rate-of-change signal for TAO flow used in leaderboard scoring. */
            taoFlowVelocity: number;
            /** Rate-of-change signal of volume-to-market-cap used in leaderboard scoring. */
            volMcapVelocity: number;
            /** Composite leaderboard score used to rank subnets (higher is better). */
            score: number;
          }[];
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/leaderboard`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSubnetStakeEvents
     * @summary Stake events for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/stake-events
     */
    getSubnetStakeEvents: (netuid: string, params: RequestParams = {}) =>
      this.request<
        {
          method: "Adding" | "Removing";
          alphaAmount: string;
          taoAmount: string;
          timestamp: string;
          coldkey: string;
          hotkey: string;
          hash: string;
          blockHeight: number;
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/stake-events`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSubnetPrice
     * @summary Price history for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/price
     */
    getSubnetPrice: (netuid: string, params: RequestParams = {}) =>
      this.request<
        {
          movingPrice: string;
          timestamp: string;
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/price`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Returns OHLCV (Open/High/Low/Close/Volume) candle data for a subnet's alpha token. Each candle is a 6-element array: `[time, open, high, low, close, volume]` - **time** – Unix epoch seconds (bucket start) - **open** – Opening price in TAO for the period - **high** – Highest price in TAO for the period - **low** – Lowest price in TAO for the period - **close** – Closing price in TAO for the period - **volume** – Total TAO volume (buys + sells) in the period Supported resolutions (in minutes): 15, 60 (default), 240, 1440 (1 day). OHLC values are derived from individual stake events (buys/sells). Each trade's price is computed as taoAmount/alphaAmount, providing accurate per-trade prices bucketed into standard OHLCV candles. Candles are sorted most-recent-first. Use `nextCursor` to paginate backwards.
     *
     * @tags Subnets
     * @name GetSubnetOhlcv
     * @summary OHLCV price chart for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/ohlcv
     */
    getSubnetOhlcv: (
      netuid: string,
      query?: {
        /**
         * Candle period in minutes: "15" (15m), "60" (1h, default), "240" (4h), "1440" (1d).
         * @default "60"
         */
        resolution?: "15" | "60" | "240" | "1440";
        /** Number of candles to return (1-500, default 100). Most recent first. */
        limit?: string;
        /** Opaque cursor from a previous response's nextCursor. When absent, returns the most recent candles. */
        cursor?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Array of candles. Each candle is [time, open, high, low, close, volume]. */
          candles: any[][];
          /** Opaque cursor for backward pagination. Pass as `cursor` query param to fetch older candles. null when no more data. */
          nextCursor: string | null;
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/ohlcv`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSubnetTokenomics
     * @summary Latest tokenomics for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/tokenomics
     */
    getSubnetTokenomics: (netuid: string, params: RequestParams = {}) =>
      this.request<
        {
          movingPrice: string;
          volume: string;
          alphaIn: string;
          alphaOut: string;
          emaTaoFlow: string;
          timestamp: string;
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/tokenomics`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Returns aggregated TAO flow totals (staked-in, unstaked-out, net) for the given time window, plus the latest Alpha flow snapshot from on-chain tokenomics. All amounts are string-encoded integers in rao (1 TAO = 1e9 rao). Designed to power the SubnetTaoFlowChart header in a single request.
     *
     * @tags Subnets
     * @name GetSubnetFlowSummary
     * @summary Pre-computed TAO + Alpha flow totals for a subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/flow-summary
     */
    getSubnetFlowSummary: (
      netuid: string,
      query?: {
        /** @default "7" */
        days?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** TAO flow totals scoped to the requested time window. */
          taoFlow: {
            /** Sum of TAO staked into the subnet within the requested window, in rao (1 TAO = 1e9 rao). String-encoded integer. */
            taoIn: string;
            /** Sum of TAO unstaked from the subnet within the requested window, in rao. String-encoded integer. */
            taoOut: string;
            /** Net TAO flow (taoIn − taoOut) within the requested window, in rao. Can be negative. String-encoded integer. */
            net: string;
          };
          /** Alpha flow from the latest tokenomics snapshot. Not time-filtered — always reflects the most recent on-chain state. */
          alphaFlow: {
            /** Total Alpha flowing into the subnet from the latest tokenomics snapshot, in rao. String-encoded integer. */
            alphaIn: string;
            /** Total Alpha flowing out of the subnet from the latest tokenomics snapshot, in rao. String-encoded integer. */
            alphaOut: string;
          };
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/flow-summary`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns a compact time-series of cumulative TAO staking flows, bucketed into 1-hour intervals. Designed for TradingView Lightweight Charts — the response is a flat array of [time, taoIn, taoOut, net] tuples to minimise payload size. Values are float TAO (divided by 1e9). Cumulative sums start from zero at the beginning of the requested window.
     *
     * @tags Subnets
     * @name GetSubnetFlowChart
     * @summary Hourly-bucketed cumulative TAO flow time-series for a subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/flow-chart
     */
    getSubnetFlowChart: (
      netuid: string,
      query?: {
        /** @default "7" */
        days?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Array of hourly data points sorted ascending by time. Each element is [time, cumulativeTaoIn, cumulativeTaoOut, net]. */
          data: any[][];
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/flow-chart`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns buy/sell counts, buy/sell volume in rao, unique participant counts, and derived momentum/activity metrics for a selected period. Momentum is computed from moving price change over the same window. Trade velocity compares current activity against the immediately preceding equal-length baseline window.
     *
     * @tags Subnets
     * @name GetSubnetTradeFlow
     * @summary Trade flow metrics for a subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/trade-flow
     */
    getSubnetTradeFlow: (
      netuid: string,
      query?: {
        /**
         * Time window for metrics. Accepted values: 1d (24h), 1w (7 days), 1m (30 days). Defaults to 1d.
         * @default "1d"
         */
        period?: "1d" | "1w" | "1m";
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Number of buy-side stake events (method=Adding) in the selected period. */
          buys: number;
          /** Number of sell-side stake events (method=Removing) in the selected period. */
          sells: number;
          /** Total buy-side TAO amount in rao for the selected period. String-encoded integer (1 TAO = 1e9 rao). */
          buyVol: string;
          /** Total sell-side TAO amount in rao for the selected period. String-encoded integer (1 TAO = 1e9 rao). */
          sellVol: string;
          /** Number of unique buyer addresses (distinct coldkeys with buy-side events). */
          buyers: number;
          /** Number of unique seller addresses (distinct coldkeys with sell-side events). */
          sellers: number;
          /** Percent change in subnet moving price over the selected period: ((endPrice - startPrice) / startPrice) * 100. */
          momentum: number;
          /** Buy-side activity share in percent, based on event counts: buys / (buys + sells) * 100. */
          accumulation: number;
          /** Trading activity versus baseline, in percent. Computed as percent change of total event count versus the immediately preceding equal-length window. */
          tradeVelocity: number;
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/trade-flow`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSubnetPositions
     * @summary Wallet positions for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/positions
     */
    getSubnetPositions: (netuid: string, params: RequestParams = {}) =>
      this.request<
        {
          coldkey: string;
          alphaBalance: string;
          costBasisTao: string;
          cumulativeRealizedProfit: string;
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/positions`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSubnetEvents
     * @summary Recent on-chain event overlays for a subnet (for chart markers)
     * @request GET:/v1/bittensor/subnets/{netuid}/events
     */
    getSubnetEvents: (
      netuid: string,
      query?: {
        limit?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          liquidityEvents: {
            id: string;
            method: string;
            coldkey: string;
            netuid: number;
            taoAmount: number | null;
            alphaAmount: number | null;
            timestamp: string;
          }[];
          stakeSwapsIn: {
            id: string;
            coldkey: string;
            hotkey: string;
            originNetuid: number;
            destinationNetuid: number;
            taoAmount: number;
            timestamp: string;
          }[];
          stakeSwapsOut: {
            id: string;
            coldkey: string;
            hotkey: string;
            originNetuid: number;
            destinationNetuid: number;
            taoAmount: number;
            timestamp: string;
          }[];
          stakeTransfersIn: {
            id: string;
            originColdkey: string;
            destinationColdkey: string;
            hotkey: string;
            originNetuid: number;
            destinationNetuid: number;
            taoAmount: number;
            timestamp: string;
          }[];
          stakeTransfersOut: {
            id: string;
            originColdkey: string;
            destinationColdkey: string;
            hotkey: string;
            originNetuid: number;
            destinationNetuid: number;
            taoAmount: number;
            timestamp: string;
          }[];
          stakeMovesIn: {
            id: string;
            sourceHotkey: string;
            sourceNetuid: number;
            destHotkey: string;
            destColdkey: string;
            destNetuid: number;
            taoAmount: number;
            timestamp: string;
          }[];
          stakeMovesOut: {
            id: string;
            sourceHotkey: string;
            sourceNetuid: number;
            destHotkey: string;
            destColdkey: string;
            destNetuid: number;
            taoAmount: number;
            timestamp: string;
          }[];
          alphaBurns: {
            id: string;
            coldkey: string;
            hotkey: string;
            netuid: number;
            alphaCurrency: number;
            timestamp: string;
          }[];
          alphaRecycles: {
            id: string;
            coldkey: string;
            hotkey: string;
            netuid: number;
            alphaCurrency: number;
            timestamp: string;
          }[];
          autoStakeAdds: {
            id: string;
            coldkey: string;
            hotkey: string;
            netuid: number;
            amount: number;
            timestamp: string;
          }[];
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/events`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSubnetHolderHistory
     * @summary Historical holder distribution for a specific subnet (top 500 wallets tracked)
     * @request GET:/v1/bittensor/subnets/{netuid}/holder-history
     */
    getSubnetHolderHistory: (
      netuid: string,
      query?: {
        days?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          date: string;
          totalHolders: number;
          whaleCount: number;
          dolphinCount: number;
          fishCount: number;
          shrimpCount: number;
          whaleAlpha: number;
          dolphinAlpha: number;
          fishAlpha: number;
          shrimpAlpha: number;
          totalAlpha: number;
          whalePercent: number;
          dolphinPercent: number;
          fishPercent: number;
          shrimpPercent: number;
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/holder-history`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSubnetHolderDistribution
     * @summary Daily holder distribution by alpha balance tiers for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/holder-distribution
     */
    getSubnetHolderDistribution: (
      netuid: string,
      query?: {
        days?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          id: string;
          netuid: number;
          snapshotDate: string;
          holdersUnder100: number;
          holders100To1k: number;
          holders1kTo10k: number;
          holders10kTo100k: number;
          holders100kTo1m: number;
          holders1mPlus: number;
          totalHolders: number;
          totalAlpha: string;
          blockHeight: number;
          timestamp: string;
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/holder-distribution`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Bittensor
     * @name GetSubnetWhaleTransactionsLegacy
     * @summary [To be deleted] Get whale stake transactions for a subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/whale-transactions
     */
    getSubnetWhaleTransactionsLegacy: (
      netuid: string,
      query?: {
        limit?: string;
        /** Filter by tier (Shrimp, Crab, Fish, Dolphin, Shark, Whale) */
        tier?: string;
        /** Filter by transaction type (StakeAdded, StakeRemoved, StakeMove, StakeTransfer, StakeSwapped) */
        transactionType?: string;
        /** Minimum TAO amount (in TAO, not rao) */
        minTaoAmount?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          id: string;
          blockHeight: number;
          extrinsicIndex: number | null;
          transactionType:
            | "StakeAdded"
            | "StakeRemoved"
            | "StakeMove"
            | "StakeTransfer"
            | "StakeSwapped";
          tier: "Shrimp" | "Crab" | "Fish" | "Dolphin" | "Shark" | "Whale";
          coldkey: string;
          hotkey: string;
          netuid: number;
          originNetuid: number | null;
          taoAmount: string;
          alphaAmount: string | null;
          destinationColdkey: string | null;
          timestamp: string;
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/whale-transactions`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSentimentSummary
     * @summary Sentiment summary for Bittensor subnets
     * @request GET:/v1/bittensor/subnets/sentiment/summary
     */
    getSentimentSummary: (params: RequestParams = {}) =>
      this.request<
        {
          total: number;
          veryBullish: number;
          bullish: number;
          neutral: number;
          bearish: number;
          veryBearish: number;
          subnetCount: number;
          sentimentScore: number;
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/sentiment/summary`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSubnetSentimentList
     * @summary Sentiment breakdown by subnet for the last 30 days
     * @request GET:/v1/bittensor/subnets/sentiment
     */
    getSubnetSentimentList: (params: RequestParams = {}) =>
      this.request<
        {
          subnetId: number;
          total: number;
          veryBullish: number;
          bullish: number;
          neutral: number;
          bearish: number;
          veryBearish: number;
          sentimentScore: number;
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/sentiment`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Deprecated
     * @name GetSubnetDailyTrend
     * @summary [To be deleted] Daily sentiment trend for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/sentiment/trend
     */
    getSubnetDailyTrend: (
      netuid: string,
      query?: {
        /**
         * @min 1
         * @max 30
         * @default 30
         */
        days?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          date: string;
          total: number;
          veryBullish: number;
          bullish: number;
          neutral: number;
          bearish: number;
          veryBearish: number;
          sentimentScore: number;
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/sentiment/trend`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Deprecated
     * @name GetSubnetTweetsLegacy
     * @summary [To be deleted] Recent analyzed tweets for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/sentiment/tweets
     */
    getSubnetTweetsLegacy: (
      netuid: string,
      query?: {
        limit?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          id: string;
          text: string;
          url: string;
          createdAt: string;
          likeCount: number;
          retweetCount: number;
          replyCount: number;
          viewCount: number;
          sentiment:
            | "very_bullish"
            | "bullish"
            | "neutral"
            | "bearish"
            | "very_bearish";
          contentType:
            | "community"
            | "opinion"
            | "announcement"
            | "hype"
            | "market_discussion"
            | "meme"
            | "technical_insight"
            | "other"
            | "milestone"
            | "partnership"
            | "fud"
            | "security"
            | "tutorial"
            | "hiring"
            | "governance";
          technicalQuality: "none" | "low" | "medium" | "high";
          marketAnalysis:
            | "social"
            | "other"
            | "technical"
            | "political"
            | "economic";
          impactPotential: "none" | "low" | "medium" | "high";
          relevanceConfidence: "low" | "medium" | "high";
          analyzedAt: string;
          isRetweet: boolean;
          isQuote: boolean;
          isReply: boolean;
          isPartOfThread: boolean;
          hasReplies: boolean;
          retweetedBy: string | null;
          replyTo: {
            username: string;
            text?: string;
          };
          quotedPost: {
            text: string;
            authorScreenName: string;
          };
          author: {
            name: string;
            screenName: string;
            profileImage: string;
            verified: boolean;
            blueVerified: boolean;
          };
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/sentiment/tweets`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets, Sentiment
     * @name GetSubnetSentiment
     * @summary Social sentiment for a specific subnet over a given period (default 30 days)
     * @request GET:/v1/bittensor/subnets/{netuid}/sentiment
     */
    getSubnetSentiment: (
      netuid: string,
      query?: {
        /**
         * @min 1
         * @max 365
         * @default 30
         */
        days?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          count: number;
          veryBullish: number;
          bullish: number;
          neutral: number;
          bearish: number;
          veryBearish: number;
          score: number;
          sentiment:
            | "very_bearish"
            | "bearish"
            | "neutral"
            | "bullish"
            | "very_bullish";
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/sentiment`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSubnetTweets
     * @summary Recent analyzed tweets for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/tweets
     */
    getSubnetTweets: (
      netuid: string,
      query?: {
        /**
         * @min 1
         * @max 365
         * @default 30
         */
        days?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          id: string;
          text: string;
          url: string;
          createdAt: string;
          likeCount: number;
          retweetCount: number;
          replyCount: number;
          viewCount: number;
          sentiment:
            | "very_bullish"
            | "bullish"
            | "neutral"
            | "bearish"
            | "very_bearish";
          contentType:
            | "community"
            | "opinion"
            | "announcement"
            | "hype"
            | "market_discussion"
            | "meme"
            | "technical_insight"
            | "other"
            | "milestone"
            | "partnership"
            | "fud"
            | "security"
            | "tutorial"
            | "hiring"
            | "governance";
          technicalQuality: "none" | "low" | "medium" | "high";
          marketAnalysis:
            | "social"
            | "other"
            | "technical"
            | "political"
            | "economic";
          impactPotential: "none" | "low" | "medium" | "high";
          relevanceConfidence: "low" | "medium" | "high";
          analyzedAt: string;
          isRetweet: boolean;
          isQuote: boolean;
          isReply: boolean;
          isPartOfThread: boolean;
          hasReplies: boolean;
          retweetedBy: string | null;
          replyTo: {
            username: string;
            text?: string;
          };
          quotedPost: {
            text: string;
            authorScreenName: string;
          };
          author: {
            name: string;
            screenName: string;
            profileImage: string;
            verified: boolean;
            blueVerified: boolean;
          };
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/tweets`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Bittensor
     * @name GetSubnetWhalesActivity
     * @summary Get whale staking events for a subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/whales-activity
     */
    getSubnetWhalesActivity: (
      netuid: string,
      query?: {
        /**
         * Number of days to look back (1-365, default: 30)
         * @min 1
         * @max 365
         * @default 30
         */
        days?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          id: string;
          blockHeight: number;
          extrinsicIndex: number | null;
          transactionType:
            | "StakeAdded"
            | "StakeRemoved"
            | "StakeMove"
            | "StakeTransfer"
            | "StakeSwapped";
          tier: "Shrimp" | "Crab" | "Fish" | "Dolphin" | "Shark" | "Whale";
          coldkey: string;
          hotkey: string;
          netuid: number;
          originNetuid: number | null;
          taoAmount: string;
          alphaAmount: string | null;
          destinationColdkey: string | null;
          timestamp: string;
        }[],
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/whales-activity`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Bittensor
     * @name GetSubnetWhalesFlow
     * @summary Get whale staking flow summary for a subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/whales-flow
     */
    getSubnetWhalesFlow: (
      netuid: string,
      query?: {
        /**
         * Number of days to look back (1-365, default: 30)
         * @min 1
         * @max 365
         * @default 30
         */
        days?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          inflow: string;
          outflow: string;
          total: string;
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/whales-flow`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSubnetCombinedScore
     * @summary Combined tokenomics, economics, and sentiment score for a subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/combined-score
     */
    getSubnetCombinedScore: (
      netuid: string,
      query?: {
        /**
         * @min 1
         * @max 365
         * @default 30
         */
        days?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          alphaFlow: string;
          emaTaoFlow: string;
          socialsSentimentScore: number;
          socialsSentiment:
            | "very_bearish"
            | "bearish"
            | "neutral"
            | "bullish"
            | "very_bullish";
          combinedScore: number;
          combinedSentiment:
            | "very_bearish"
            | "bearish"
            | "neutral"
            | "bullish"
            | "very_bullish";
          economicScore: number;
          economicSentiment:
            | "very_bearish"
            | "bearish"
            | "neutral"
            | "bullish"
            | "very_bullish";
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/combined-score`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSubnetHolders
     * @summary Aggregated holder metrics for a specific subnet (total, change, concentration, TAO-based tiers)
     * @request GET:/v1/bittensor/subnets/{netuid}/holders
     */
    getSubnetHolders: (
      netuid: string,
      query?: {
        /**
         * Number of days to look back for change calculation (1-365, default: 30)
         * @min 1
         * @max 365
         * @default 30
         */
        days?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Current total number of unique wallet addresses holding alpha tokens on this subnet */
          totalHolders: number;
          /** Absolute change in holder count over the specified period (positive = growth, negative = decline) */
          holderChange: number;
          /** Number of wallet addresses that fall within the top 10% of holders by TAO value */
          top10Concentration: number;
          /** Percentage of holders who performed at least one staking event (add/remove stake) during the period */
          avgTradePercent: number;
          /** Distribution of holders across 4 tiers based on TAO value thresholds (consistent across subnets) */
          breakdown: {
            /** Holders with > 1,000 TAO value */
            whale: {
              /** Number of holders in this tier */
              count: number;
              /** Percentage of total holders in this tier */
              percent: number;
            };
            /** Holders with > 100 and <= 1,000 TAO value */
            dolphin: {
              /** Number of holders in this tier */
              count: number;
              /** Percentage of total holders in this tier */
              percent: number;
            };
            /** Holders with > 10 and <= 100 TAO value */
            fish: {
              /** Number of holders in this tier */
              count: number;
              /** Percentage of total holders in this tier */
              percent: number;
            };
            /** Holders with <= 10 TAO value */
            shrimp: {
              /** Number of holders in this tier */
              count: number;
              /** Percentage of total holders in this tier */
              percent: number;
            };
          };
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/holders`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),
  };
}
