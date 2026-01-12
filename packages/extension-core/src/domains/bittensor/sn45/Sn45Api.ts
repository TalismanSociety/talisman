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

export type QueryParamsType = Record<string | number, any>
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean
  /** request path */
  path: string
  /** content type of request body */
  type?: ContentType
  /** query params */
  query?: QueryParamsType
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat
  /** request body */
  body?: unknown
  /** base url */
  baseUrl?: string
  /** request cancellation token */
  cancelToken?: CancelToken
}

export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void
  customFetch?: typeof fetch
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
  data: D
  error: E
}

type CancelToken = Symbol | string | number

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = ""
  private securityData: SecurityDataType | null = null
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"]
  private abortControllers = new Map<CancelToken, AbortController>()
  private customFetch = (...fetchParams: Parameters<typeof fetch>) => fetch(...fetchParams)

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  }

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig)
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data
  }

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key)
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key])
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key]
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&")
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {}
    const keys = Object.keys(query).filter((key) => "undefined" !== typeof query[key])
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&")
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery)
    return queryString ? `?${queryString}` : ""
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
      input !== null && typeof input !== "string" ? JSON.stringify(input) : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key]
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        )
        return formData
      }, new FormData())
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  }

  protected mergeRequestParams(params1: RequestParams, params2?: RequestParams): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    }
  }

  protected createAbortSignal = (cancelToken: CancelToken): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken)
      if (abortController) {
        return abortController.signal
      }
      return void 0
    }

    const abortController = new AbortController()
    this.abortControllers.set(cancelToken, abortController)
    return abortController.signal
  }

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken)

    if (abortController) {
      abortController.abort()
      this.abortControllers.delete(cancelToken)
    }
  }

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
      {}
    const requestParams = this.mergeRequestParams(params, secureParams)
    const queryString = query && this.toQueryString(query)
    const payloadFormatter = this.contentFormatters[type || ContentType.Json]
    const responseFormat = format || requestParams.format

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData ? { "Content-Type": type } : {}),
        },
        signal: (cancelToken ? this.createAbortSignal(cancelToken) : requestParams.signal) || null,
        body: typeof body === "undefined" || body === null ? null : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>
      r.data = null as unknown as T
      r.error = null as unknown as E

      const responseToParse = responseFormat ? response.clone() : response
      const data = !responseFormat
        ? r
        : await responseToParse[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data
              } else {
                r.error = data
              }
              return r
            })
            .catch((e) => {
              r.error = e
              return r
            })

      if (cancelToken) {
        this.abortControllers.delete(cancelToken)
      }

      if (!response.ok) throw data
      return data
    })
  }
}

/**
 * @title OpenAPI
 * @version 1.0.0
 */
export class Sn45Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
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
          price: string | null
          timestamp: string | null
        },
        {
          error: {
            code: string
            message: string
          }
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
        minTao?: string
        limit?: string
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          method: "Adding" | "Removing"
          coldkey: string
          coldkeyShort: string
          netuid: number
          taoAmount: number
          alphaAmount: number
          timestamp: string
        }[],
        {
          error: {
            code: string
            message: string
          }
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
     * @tags Subnets
     * @name GetSubnetEconomicsList
     * @summary Economics data for subnets
     * @request GET:/v1/bittensor/subnets/economics
     */
    getSubnetEconomicsList: (params: RequestParams = {}) =>
      this.request<
        {
          netuid: number
          price: number
          volume: number
          alphaIn: number
          alphaOut: number
          netAlpha: number
          emaTaoFlow: number
          economicScore: number
          flowDirection: "inflow" | "outflow" | "neutral"
          timestamp: string
        }[],
        {
          error: {
            code: string
            message: string
          }
        }
      >({
        path: `/v1/bittensor/subnets/economics`,
        method: "GET",
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
          method: "Adding" | "Removing"
          alphaAmount: string
          taoAmount: string
          timestamp: string
          coldkey?: string
        }[],
        {
          error: {
            code: string
            message: string
          }
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
          movingPrice: string
          timestamp: string
        }[],
        {
          error: {
            code: string
            message: string
          }
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/price`,
        method: "GET",
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
          movingPrice: string
          volume: string
          alphaIn: string
          alphaOut: string
          emaTaoFlow: string
          timestamp: string
        },
        {
          error: {
            code: string
            message: string
          }
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/tokenomics`,
        method: "GET",
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
          coldkey: string
          alphaBalance: string
          costBasisTao: string
          cumulativeRealizedProfit: string
        }[],
        {
          error: {
            code: string
            message: string
          }
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
        limit?: string
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          liquidityEvents: {
            id: string
            method: string
            coldkey: string
            netuid: number
            taoAmount: number | null
            alphaAmount: number | null
            timestamp: string
          }[]
          stakeSwapsIn: {
            id: string
            coldkey: string
            hotkey: string
            originNetuid: number
            destinationNetuid: number
            taoAmount: number
            timestamp: string
          }[]
          stakeSwapsOut: {
            id: string
            coldkey: string
            hotkey: string
            originNetuid: number
            destinationNetuid: number
            taoAmount: number
            timestamp: string
          }[]
          stakeTransfersIn: {
            id: string
            originColdkey: string
            destinationColdkey: string
            hotkey: string
            originNetuid: number
            destinationNetuid: number
            taoAmount: number
            timestamp: string
          }[]
          stakeTransfersOut: {
            id: string
            originColdkey: string
            destinationColdkey: string
            hotkey: string
            originNetuid: number
            destinationNetuid: number
            taoAmount: number
            timestamp: string
          }[]
          stakeMovesIn: {
            id: string
            sourceHotkey: string
            sourceNetuid: number
            destHotkey: string
            destColdkey: string
            destNetuid: number
            taoAmount: number
            timestamp: string
          }[]
          stakeMovesOut: {
            id: string
            sourceHotkey: string
            sourceNetuid: number
            destHotkey: string
            destColdkey: string
            destNetuid: number
            taoAmount: number
            timestamp: string
          }[]
          alphaBurns: {
            id: string
            coldkey: string
            hotkey: string
            netuid: number
            alphaCurrency: number
            timestamp: string
          }[]
          alphaRecycles: {
            id: string
            coldkey: string
            hotkey: string
            netuid: number
            alphaCurrency: number
            timestamp: string
          }[]
          autoStakeAdds: {
            id: string
            coldkey: string
            hotkey: string
            netuid: number
            amount: number
            timestamp: string
          }[]
        },
        {
          error: {
            code: string
            message: string
          }
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
     * @name GetSentimentSummary
     * @summary Sentiment summary for Bittensor subnets
     * @request GET:/v1/bittensor/subnets/sentiment/summary
     */
    getSentimentSummary: (params: RequestParams = {}) =>
      this.request<
        {
          total: number
          veryBullish: number
          bullish: number
          neutral: number
          bearish: number
          veryBearish: number
          subnetCount: number
          sentimentScore: number
        },
        {
          error: {
            code: string
            message: string
          }
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
          subnetId: number
          total: number
          veryBullish: number
          bullish: number
          neutral: number
          bearish: number
          veryBearish: number
          sentimentScore: number
        }[],
        {
          error: {
            code: string
            message: string
          }
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
     * @tags Subnets
     * @name GetSubnetDailyTrend
     * @summary Daily sentiment trend for a specific subnet over the last 30 days
     * @request GET:/v1/bittensor/subnets/{netuid}/sentiment/trend
     */
    getSubnetDailyTrend: (netuid: string, params: RequestParams = {}) =>
      this.request<
        {
          date: string
          total: number
          veryBullish: number
          bullish: number
          neutral: number
          bearish: number
          veryBearish: number
          sentimentScore: number
        }[],
        {
          error: {
            code: string
            message: string
          }
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/sentiment/trend`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subnets
     * @name GetSubnetTweets
     * @summary Recent analyzed tweets for a specific subnet
     * @request GET:/v1/bittensor/subnets/{netuid}/sentiment/tweets
     */
    getSubnetTweets: (
      netuid: string,
      query?: {
        limit?: string
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          id: string
          text: string
          url: string
          createdAt: string
          likeCount: number
          retweetCount: number
          replyCount: number
          viewCount: number
          sentiment: string
          contentType: string
          technicalQuality: string
          marketAnalysis: string
          impactPotential: string
          relevanceConfidence: string
          analyzedAt: string
          isRetweet: boolean
          isQuote: boolean
          isReply: boolean
          isPartOfThread: boolean
          hasReplies: boolean
          retweetedBy: string | null
          replyTo: {
            username: string
            text?: string
          }
          quotedPost: {
            text: string
            authorScreenName: string
          }
          author: {
            name: string
            screenName: string
            profileImage: string
            verified: boolean
            blueVerified: boolean
          }
        }[],
        {
          error: {
            code: string
            message: string
          }
        }
      >({
        path: `/v1/bittensor/subnets/${netuid}/sentiment/tweets`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),
  }
}
