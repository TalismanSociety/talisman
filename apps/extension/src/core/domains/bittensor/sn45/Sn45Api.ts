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
 * @title SN45 Data API
 * @version 1.0.0
 * @externalDocs https://github.com/TalismanSociety/sn45-data-api
 *
 * Read-only REST API serving aggregated Bittensor subnet 45 data — economics, sentiment, holders, whale activity, and trade flows. All responses are JSON. Data is cached with stale-while-revalidate semantics.
 */
export class Sn45Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  v1 = {
    /**
     * @description Returns the most recent TAO market snapshot including spot price and common market metrics. Null values indicate that the upstream field is unavailable for the latest record.
     *
     * @tags Bittensor
     * @name GetTaoPrice
     * @summary Latest TAO USD price
     * @request GET:/v1/bittensor/tao-price
     */
    getTaoPrice: (params: RequestParams = {}) =>
      this.request<
        {
          /** Latest TAO price in USD. Null when no recent snapshot exists. */
          price: string | null;
          /** ISO timestamp for the returned price snapshot. */
          timestamp: string | null;
          /** Market capitalization in USD. */
          marketCap: number | null;
          /** 24-hour trading volume in USD. */
          volume24h: number | null;
          /** TAO price change over 24 hours, as a percentage. */
          priceChange24h: number | null;
          /** TAO price change over 7 days, as a percentage. */
          priceChange7d: number | null;
          /** TAO price change over 30 days, as a percentage. */
          priceChange30d: number | null;
          /** Market cap change over 24 hours, as a percentage. */
          marketCapChange24h: number | null;
          /** Upstream data source identifier for the price snapshot. */
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
     * @description Returns recent stake add/remove events for a subnet with associated extrinsic hashes. Amounts are string-encoded integers in rao.
     *
     * @tags Subnets
     * @name GetSubnetStakeEvents
     * @summary Stake events for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/stake-events
     */
    getSubnetStakeEvents: (netuid: string, params: RequestParams = {}) =>
      this.request<
        {
          /** Stake event type. */
          method: "Adding" | "Removing";
          /** Alpha amount involved, string-encoded integer in rao. */
          alphaAmount: string;
          /** TAO amount involved, string-encoded integer in rao. */
          taoAmount: string;
          /** ISO timestamp of the stake event. */
          timestamp: string;
          /** Coldkey address (SS58-encoded). */
          coldkey: string;
          /** Hotkey address (SS58-encoded). */
          hotkey: string;
          /** Extrinsic hash associated with the event. */
          hash: string;
          /** Block number containing the stake event. */
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
     * @description Returns historical moving price samples for a subnet in ascending time order. Useful for charting simple price history series.
     *
     * @tags Subnets
     * @name GetSubnetPrice
     * @summary Price history for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/price
     */
    getSubnetPrice: (netuid: string, params: RequestParams = {}) =>
      this.request<
        {
          /** Subnet moving price in TAO at the snapshot time. */
          movingPrice: string;
          /** ISO timestamp of the price sample. */
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
     * @description Returns OHLCV (Open/High/Low/Close/Volume) candle data for a subnet's alpha token. Each candle is a 6-element array: `[time, open, high, low, close, volume]` - **time** – Unix epoch seconds (bucket start) - **open** – Opening price in TAO for the period - **high** – Highest price in TAO for the period - **low** – Lowest price in TAO for the period - **close** – Closing price in TAO for the period - **volume** – Total TAO volume (buys + sells) in the period Supported resolutions (in minutes): 5, 15, 60 (default), 240, 1440 (1 day). OHLC values are derived from individual stake events (buys/sells). Each trade's price is computed as taoAmount/alphaAmount, providing accurate per-trade prices bucketed into standard OHLCV candles. Candles are sorted most-recent-first. Use `nextCursor` to paginate backwards.
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
         * Candle period in minutes: "5" (5m), "15" (15m), "60" (1h, default), "240" (4h), "1440" (1d).
         * @default "60"
         */
        resolution?: "5" | "15" | "60" | "240" | "1440";
        /** Number of candles to return (1-100, default 100). Most recent first. */
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
          /** Block height of the most recent indexed event used to build the current candles. Only present for latest (non-cursor) requests; null otherwise. */
          lastBlockHeight: number | null;
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
     * @description Returns the latest tokenomics snapshot for a subnet, including price, volume, alpha flows, and EMA TAO flow. Amount-like fields are string-encoded integers in rao.
     *
     * @tags Subnets
     * @name GetSubnetTokenomics
     * @summary Latest tokenomics for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/tokenomics
     */
    getSubnetTokenomics: (netuid: string, params: RequestParams = {}) =>
      this.request<
        {
          /** Latest moving price for the subnet, in TAO. */
          movingPrice: string;
          /** Latest traded TAO volume, string-encoded integer in rao. */
          volume: string;
          /** Latest alpha-in amount, string-encoded integer in rao. */
          alphaIn: string;
          /** Latest alpha-out amount, string-encoded integer in rao. */
          alphaOut: string;
          /** Latest EMA TAO flow value, string-encoded integer in rao. */
          emaTaoFlow: string;
          /** ISO timestamp of the tokenomics snapshot. */
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
     * @description Returns a compact time-series of cumulative TAO staking flows plus period totals, bucketed into 1-hour intervals. The `series` array contains [time, taoIn, taoOut, net] tuples designed for TradingView Lightweight Charts. Values are float TAO (divided by 1e9). Cumulative sums are window-relative (start from zero). The `totals` object provides aggregate TAO and ALPHA flow amounts for the period.
     *
     * @tags Subnets
     * @name GetSubnetTaoFlow
     * @summary Hourly-bucketed cumulative TAO flow time-series for a subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/tao-flow
     */
    getSubnetTaoFlow: (
      netuid: string,
      query?: {
        /**
         * Time window for chart data. Accepted values: 1d, 1w, 1m. Defaults to 1w.
         * @default "1w"
         */
        period?: "1d" | "1w" | "1m";
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Array of hourly data points sorted ascending by time. Each element is [time, cumulativeTaoIn, cumulativeTaoOut, net]. Cumulative sums are window-relative (start from zero at the beginning of the requested period). */
          series: any[][];
          /** Aggregated flow totals for the requested time window. */
          totals: {
            /** Total TAO staked in during the period (float TAO). */
            taoIn: number;
            /** Total TAO unstaked out during the period (float TAO). */
            taoOut: number;
            /** Total ALPHA staked in during the period (float ALPHA). */
            alphaIn: number;
            /** Total ALPHA unstaked out during the period (float ALPHA). */
            alphaOut: number;
          };
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/tao-flow`,
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
     * @description Returns top wallet positions for a subnet ordered by alpha balance. Numeric value fields are string-encoded integers in rao.
     *
     * @tags Subnets
     * @name GetSubnetPositions
     * @summary Wallet positions for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/positions
     */
    getSubnetPositions: (netuid: string, params: RequestParams = {}) =>
      this.request<
        {
          /** Wallet coldkey address (SS58-encoded). */
          coldkey: string;
          /** Current alpha balance, string-encoded integer in rao. */
          alphaBalance: string;
          /** Accumulated TAO cost basis, string-encoded integer in rao. */
          costBasisTao: string;
          /** Cumulative realized profit in TAO terms, string-encoded integer in rao. */
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
     * @description Returns aggregate social sentiment counts and a derived score for a single subnet. Sentiment is computed from analyzed tweets within the requested lookback window.
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
         * Lookback period. Accepted values: 1d, 1w, 1m. Defaults to 1m.
         * @default "1m"
         */
        period?: "1d" | "1w" | "1m";
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Total analyzed tweets in the selected window. */
          count: number;
          /** Count of very bullish tweets. */
          veryBullish: number;
          /** Count of bullish tweets. */
          bullish: number;
          /** Count of neutral tweets. */
          neutral: number;
          /** Count of bearish tweets. */
          bearish: number;
          /** Count of very bearish tweets. */
          veryBearish: number;
          /** Weighted sentiment score derived from class counts. */
          score: number;
          /** Label mapped from the weighted sentiment score. */
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
     * @description Returns recent analyzed tweets for a subnet with sentiment labels, classification metadata, and author context. Use this endpoint to render social feed cards and tweet-level sentiment details.
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
         * Lookback period. Accepted values: 1d, 1w, 1m. Defaults to 1m.
         * @default "1m"
         */
        period?: "1d" | "1w" | "1m";
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Tweet identifier. */
          id: string;
          /** Tweet text content. */
          text: string;
          /** Canonical tweet URL. */
          url: string;
          /** ISO timestamp when the tweet was created. */
          createdAt: string;
          /** Like count at ingestion time. */
          likeCount: number;
          /** Retweet count at ingestion time. */
          retweetCount: number;
          /** Reply count at ingestion time. */
          replyCount: number;
          /** View count at ingestion time, when available. */
          viewCount: number;
          /** Model-assigned sentiment label for the tweet. */
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
          /** Model-assigned technical depth assessment. */
          technicalQuality: "none" | "low" | "medium" | "high";
          /** Model-assigned analysis category. */
          marketAnalysis:
            | "social"
            | "other"
            | "technical"
            | "political"
            | "economic";
          /** Model-assigned potential market impact level. */
          impactPotential: "none" | "low" | "medium" | "high";
          /** Confidence level for subnet relevance classification. */
          relevanceConfidence: "low" | "medium" | "high";
          /** ISO timestamp when tweet analysis was produced. */
          analyzedAt: string;
          /** True when this item represents a retweet. */
          isRetweet: boolean;
          /** True when this item quotes another tweet. */
          isQuote: boolean;
          /** True when this item is a reply. */
          isReply: boolean;
          /** True when tweet is in a conversation thread. */
          isPartOfThread: boolean;
          /** True when tweet has one or more replies. */
          hasReplies: boolean;
          /** Screen name of retweeter when item is a retweet. */
          retweetedBy: string | null;
          /** Reply context for reply tweets. */
          replyTo: {
            /** Username being replied to. */
            username: string;
            /** Preview text of the replied tweet, when available. */
            text?: string;
          };
          /** Quoted tweet context for quote tweets. */
          quotedPost: {
            /** Text content of the quoted tweet. */
            text: string;
            /** Author screen name of the quoted tweet. */
            authorScreenName: string;
          };
          author: {
            /** Display name of the tweet author. */
            name: string;
            /** Screen name (handle) of the tweet author. */
            screenName: string;
            /** Profile image URL of the tweet author. */
            profileImage: string;
            /** Whether the author is verified. */
            verified: boolean;
            /** Whether the author has blue verification status. */
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
     * @description Returns whale-tier stake transactions for a subnet within the selected lookback window. Amounts are string-encoded integers in rao and addresses are returned in SS58 format.
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
         * Lookback period for whale activity. Accepted values: 1d, 1w, 1m. Default: 1m.
         * @default "1m"
         */
        period?: "1d" | "1w" | "1m";
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Whale transaction identifier. */
          id: string;
          /** Block number containing the transaction. */
          blockHeight: number;
          /** Extrinsic index within the block, when available. */
          extrinsicIndex: number | null;
          /** Whale transaction type. */
          transactionType:
            | "StakeAdded"
            | "StakeRemoved"
            | "StakeMove"
            | "StakeTransfer"
            | "StakeSwapped";
          /** Whale tier classification for the source wallet. */
          tier: "Shrimp" | "Crab" | "Fish" | "Dolphin" | "Shark" | "Whale";
          /** Source coldkey address (SS58-encoded). */
          coldkey: string;
          /** Source hotkey address (SS58-encoded). */
          hotkey: string;
          /** Subnet identifier (netuid). */
          netuid: number;
          /** Origin subnet for cross-subnet operations, when applicable. */
          originNetuid: number | null;
          /** TAO amount as string-encoded integer in rao. */
          taoAmount: string;
          /** Alpha amount as string-encoded integer in rao, when applicable. */
          alphaAmount: string | null;
          /** Destination coldkey for transfers, when applicable. */
          destinationColdkey: string | null;
          /** ISO timestamp of the whale transaction. */
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
     * @description Returns aggregate whale inflow, outflow, and total flow for a subnet over the selected window. All amount fields are string-encoded integers in rao.
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
         * Lookback period for whale flow. Accepted values: 1d, 1w, 1m. Default: 1m.
         * @default "1m"
         */
        period?: "1d" | "1w" | "1m";
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Sum of whale StakeAdded TAO amounts in rao, string-encoded integer. */
          inflow: string;
          /** Sum of whale StakeRemoved TAO amounts in rao, string-encoded integer. */
          outflow: string;
          /** Combined whale flow (inflow + outflow) in rao, string-encoded integer. */
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
     * @description Returns holder-overview metrics for a subnet, including total holders, period-over-period change, top-decile concentration proxy, active-trader share, and TAO-value tier distribution.
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
         * Lookback period for holder-change and trader-activity calculations. Accepted values: 1d, 1w, 1m. Default: 1m.
         * @default "1m"
         */
        period?: "1d" | "1w" | "1m";
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

    /**
     * @description Returns a list of subnets with price, volume, market cap, and holder data. Combines leaderboard data with the latest TAO/USD price for USD conversion.
     *
     * @tags Terminal
     * @name GetTerminalSubnets
     * @summary Subnet list for token picker
     * @request GET:/v1/terminal/subnets
     */
    getTerminalSubnets: (
      query?: {
        /**
         * Leaderboard window. Defaults to 1d.
         * @default "1d"
         */
        period?: "1d" | "1w" | "1m";
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Latest TAO price in USD. */
          taoPrice: number;
          /** Subnet list for token picker. */
          subnets: {
            /** Subnet identifier. */
            netuid: number;
            /** Latest subnet alpha price in TAO. */
            currentPrice: number | null;
            /** Current price in USD (currentPrice * taoPrice). */
            priceUsd: number | null;
            /** Percent price change over the requested period. */
            priceChange: number | null;
            /** Total traded TAO volume during the period, in rao. */
            volume: string;
            /** Subnet market cap proxy, in rao-denominated units. */
            mcap: string | null;
            /** Total TAO staked, in rao. */
            stakedTao: string | null;
            /** Total alpha staked, in alpha rao units. */
            stakedAlpha: string | null;
            /** Current number of unique holder wallets. */
            totalHolders: number;
            /** Seven-day price history series in TAO, oldest to newest. */
            priceHistory7d: number[];
          }[];
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/terminal/subnets`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns combined tokenomics, leaderboard metrics, and sentiment data for a single subnet. All four data sources are fetched in parallel for low latency.
     *
     * @tags Terminal
     * @name GetTerminalSubnetOverview
     * @summary Subnet detail for analysis panel
     * @request GET:/v1/terminal/subnets/{netuid}/overview
     */
    getTerminalSubnetOverview: (
      netuid: string,
      query?: {
        /**
         * Lookback period. Defaults to 1d.
         * @default "1d"
         */
        period?: "1d" | "1w" | "1m";
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Subnet identifier. */
          netuid: number;
          /** Latest TAO price in USD. */
          taoPrice: number;
          /** Latest tokenomics snapshot. */
          tokenomics: {
            /** Latest moving price in TAO. */
            movingPrice: string;
            /** Latest traded TAO volume, in rao. */
            volume: string;
            /** Latest alpha-in amount, in rao. */
            alphaIn: string;
            /** Latest alpha-out amount, in rao. */
            alphaOut: string;
            /** Latest EMA TAO flow value, in rao. */
            emaTaoFlow: string;
            /** ISO timestamp of the snapshot. */
            timestamp: string;
          };
          /** Leaderboard metrics. */
          leaderboard: {
            /** Market cap proxy, in rao. */
            mcap: string | null;
            /** Total TAO staked, in rao. */
            stakedTao: string | null;
            /** Total alpha staked, in rao. */
            stakedAlpha: string | null;
            /** Unique holder wallets. */
            totalHolders: number;
            /** Alpha-out emission amount. */
            alphaOutEmission: string | null;
            /** Alpha-in emission amount. */
            alphaInEmission: string | null;
            /** TAO-in emission amount. */
            taoInEmission: string | null;
            /** Buy-side stake events in the period. */
            buyCount: number;
            /** Sell-side stake events in the period. */
            sellCount: number;
            /** Total stake events in the period. */
            txCount: number;
            /** TAO flow velocity signal. */
            taoFlowVelocity: number;
            /** Volume/market-cap velocity signal. */
            volMcapVelocity: number;
            /** Composite leaderboard score. */
            score: number;
            /** Percent price change over the period. */
            priceChange: number | null;
          };
          /** Aggregate sentiment data. */
          sentiment: {
            /** Weighted sentiment score (-2 to +2). */
            score: number;
            /** Sentiment label. */
            label:
              | "very_bearish"
              | "bearish"
              | "neutral"
              | "bullish"
              | "very_bullish";
            /** Score normalized to 0-100 range. */
            normalized: number;
            counts: {
              veryBullish: number;
              bullish: number;
              neutral: number;
              bearish: number;
              veryBearish: number;
            };
            /** Total analyzed tweets. */
            total: number;
          };
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/terminal/subnets/${netuid}/overview`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns recent stake add/remove events formatted as market trades with price, side, and coldkey. Price is computed as taoAmount / alphaAmount.
     *
     * @tags Terminal
     * @name GetTerminalSubnetTrades
     * @summary Recent market trades for a subnet
     * @request GET:/v1/terminal/subnets/{netuid}/trades
     */
    getTerminalSubnetTrades: (
      netuid: string,
      query?: {
        /**
         * Number of trades to return (1-100). Defaults to 50.
         * @default "50"
         */
        limit?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Recent market trades for the subnet. */
          trades: {
            /** Trade identifier (blockHeight-extrinsicIndex). */
            id: string;
            /** Block number containing the trade. */
            blockHeight: number;
            /** Effective price (taoAmount / alphaAmount). */
            price: number;
            /** TAO amount involved, in rao. */
            taoAmount: string;
            /** Alpha amount involved, in rao. */
            alphaAmount: string;
            /** Trade side. */
            side: "buy" | "sell";
            /** Coldkey address (SS58-encoded). */
            coldkey: string;
            /** ISO timestamp of the trade. */
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
        path: `/v1/terminal/subnets/${netuid}/trades`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns recent tweets with sentiment analysis for a subnet, formatted as social signals. Includes an aggregate score normalized to 0-100.
     *
     * @tags Terminal
     * @name GetTerminalSubnetSignals
     * @summary Social signal feed for a subnet
     * @request GET:/v1/terminal/subnets/{netuid}/signals
     */
    getTerminalSubnetSignals: (
      netuid: string,
      query?: {
        /**
         * Number of signals to return (1-50). Defaults to 20.
         * @default "20"
         */
        limit?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Aggregate sentiment score normalized to 0-100. */
          aggregateScore: number;
          /** Social signal feed. */
          signals: {
            /** Tweet identifier. */
            id: string;
            /** Model-assigned sentiment label. */
            sentiment: string;
            /** Signal strength (1-3). */
            strength: number;
            /** ISO timestamp when analysis was produced. */
            timestamp: string;
            author: {
              /** Author screen name. */
              handle: string;
              /** Author display name. */
              name: string;
              /** Author profile image URL. */
              avatarUrl: string;
            };
            /** Tweet text content. */
            text: string;
            /** Canonical tweet URL. */
            url: string;
            engagement: {
              likes: number;
              retweets: number;
              replies: number;
              views: number;
            };
          }[];
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/terminal/subnets/${netuid}/signals`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns a wallet's portfolio with per-subnet positions including TAO value, USD value, cost basis, and PnL calculations.
     *
     * @tags Terminal
     * @name GetTerminalWalletPortfolio
     * @summary Wallet portfolio with per-subnet positions
     * @request GET:/v1/terminal/wallet/{address}/portfolio
     */
    getTerminalWalletPortfolio: (address: string, params: RequestParams = {}) =>
      this.request<
        {
          /** SS58 coldkey address. */
          address: string;
          /** Latest TAO price in USD. */
          taoPrice: number;
          /** Total portfolio value in TAO, in rao. */
          totalTaoValue: string;
          /** Total portfolio value in USD. */
          totalUsdValue: number;
          /** 24-hour portfolio value change percentage, or null if no prior data. */
          changePercent24h: number | null;
          /** Per-subnet positions. */
          positions: {
            /** Subnet identifier. */
            netuid: number;
            /** Alpha token balance, in rao. */
            alphaBalance: string;
            /** Current TAO value of the position, in rao. */
            taoValue: string;
            /** Current USD value of the position. */
            usdValue: number;
            /** Cost basis in TAO, in rao. */
            costBasisTao: string;
            /** Unrealized PnL in TAO, in rao. */
            unrealizedPnlTao: string;
            /** Realized PnL in TAO, in rao. */
            realizedPnlTao: string;
          }[];
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/terminal/wallet/${address}/portfolio`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Returns a composite analysis for a wallet including net TAO flow over the last 30 days, portfolio ROI based on cost basis and PnL, and portfolio-weighted sentiment across held subnets.
     *
     * @tags Terminal
     * @name GetTerminalWalletAnalysis
     * @summary Wallet analysis with alpha flow, economics, and sentiment
     * @request GET:/v1/terminal/wallet/{address}/analysis
     */
    getTerminalWalletAnalysis: (address: string, params: RequestParams = {}) =>
      this.request<
        {
          alphaFlow: {
            /** Net TAO flow (taoIn - taoOut), in rao. */
            net: string;
            /** Total TAO staked in the last 30 days, in rao. */
            taoIn: string;
            /** Total TAO unstaked in the last 30 days, in rao. */
            taoOut: string;
          };
          economic: {
            /** Sum of cost basis across all positions, in rao. */
            totalCostBasis: string;
            /** Total PnL (unrealized + realized), in rao. */
            totalPnl: string;
            /** ROI percentage, or null if no cost basis. */
            roiPercent: number | null;
          };
          /** Portfolio-weighted sentiment, or null if no sentiment data. */
          sentiment: {
            /** Weighted average sentiment normalized to 0-100. */
            normalized: number;
            /** Sentiment label derived from the weighted score. */
            label:
              | "very_bearish"
              | "bearish"
              | "neutral"
              | "bullish"
              | "very_bullish";
          };
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/terminal/wallet/${address}/analysis`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Returns stake/unstake transaction history for a wallet, optionally filtered by subnet.
     *
     * @tags Terminal
     * @name GetTerminalWalletTransactions
     * @summary Wallet transaction history
     * @request GET:/v1/terminal/wallet/{address}/transactions
     */
    getTerminalWalletTransactions: (
      address: string,
      query?: {
        /**
         * Number of transactions to return (1-100). Defaults to 50.
         * @default "50"
         */
        limit?: string;
        /** Optional subnet filter. */
        netuid?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Wallet transaction history. */
          transactions: {
            /** Transaction identifier (blockHeight-extrinsicIndex). */
            id: string;
            /** Block number containing the transaction. */
            blockHeight: number;
            /** Subnet identifier. */
            netuid: number;
            /** Transaction type. */
            type: "stake" | "unstake";
            /** TAO amount involved, in rao. */
            taoAmount: string;
            /** Alpha amount involved, in rao. */
            alphaAmount: string;
            /** ISO timestamp of the transaction. */
            timestamp: string;
            /** Coldkey address (SS58-encoded). */
            coldkey: string;
            /** Hotkey address (SS58-encoded). */
            hotkey: string;
          }[];
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/terminal/wallet/${address}/transactions`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns historical portfolio value data points for a wallet over the requested period. Aggregates daily stake snapshots across all subnets and converts to USD.
     *
     * @tags Terminal
     * @name GetTerminalWalletHistory
     * @summary Historical portfolio value over time
     * @request GET:/v1/terminal/wallet/{address}/portfolio/history
     */
    getTerminalWalletHistory: (
      address: string,
      query?: {
        /**
         * Lookback period. Defaults to 1m.
         * @default "1m"
         */
        period?: "1w" | "1m" | "6m" | "1y";
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Historical portfolio value data points. */
          points: {
            /** Date in YYYY-MM-DD format. */
            date: string;
            /** Total portfolio TAO value on this date, in rao. */
            taoValue: string;
            /** Total portfolio USD value on this date. */
            usdValue: number;
          }[];
        },
        {
          error: {
            code: string;
            message: string;
          };
        }
      >({
        path: `/v1/terminal/wallet/${address}/portfolio/history`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),
  };
}
