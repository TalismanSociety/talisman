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
 * @title TAO Data API
 * @version 1.0.0
 * @externalDocs https://github.com/TalismanSociety/tao-data-api
 *
 * Read-only REST API serving aggregated Bittensor network data — pools, subnets, and validators — sourced from the Taostats upstream API. All responses are JSON. Data is cached with stale-while-revalidate semantics.
 */
export class TaoDataApi<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  pools = {
    /**
     * @description Returns current metrics for every dTAO liquidity pool including price, market cap, 24-hour volume, seller count, and a 7-day price history series.
     *
     * @tags Pools
     * @name ListPools
     * @summary List all dTAO liquidity pools
     * @request GET:/pools
     */
    listPools: (params: RequestParams = {}) =>
      this.request<
        {
          /** Unique subnet identifier on Bittensor (netuid). */
          netuid: number;
          /** Total TAO in the pool. */
          total_tao: number | string;
          /** Total alpha token amount in the pool. */
          total_alpha: number | string;
          /** Current pool price. */
          price: number | string;
          /** Pool price change over the last 24 hours. */
          price_change_1_day: number | string;
          /** Current market capitalization for the pool. */
          market_cap: number | string;
          /** TAO trading volume over the last 24 hours. */
          tao_volume_24_hr: number | string;
          /** Number of unique sellers in the last 24 hours. */
          sellers_24h: number | string;
          /** Seven-day price series ordered from oldest to newest. */
          seven_day_prices: (
            | number
            | string
            | {
                /** Block height for the historical price sample. */
                block_number: number;
                /** ISO timestamp for the historical price sample. */
                timestamp: string;
                /** Pool price at the sample timestamp. */
                price: number | string;
              }
          )[];
        }[],
        | {
            error: {
              /** Error code. */
              code: "rate_limited";
              /** Human-readable message. */
              message: string;
            };
          }
        | {
            /** Machine-readable error reason. */
            error: string;
          }
      >({
        path: `/pools`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  subnets = {
    /**
     * @description Returns the latest snapshot of every registered Bittensor subnet with its netuid, emission value, and tempo parameter.
     *
     * @tags Subnets
     * @name ListSubnets
     * @summary List all Bittensor subnets
     * @request GET:/subnets
     */
    listSubnets: (params: RequestParams = {}) =>
      this.request<
        {
          /** Unique subnet identifier on Bittensor (netuid). */
          netuid: number;
          /** Current subnet emission value as a string. */
          emission: string;
          /** Subnet tempo (epoch cadence parameter). */
          tempo: number;
        }[],
        | {
            error: {
              /** Error code. */
              code: "rate_limited";
              /** Human-readable message. */
              message: string;
            };
          }
        | {
            /** Machine-readable error reason. */
            error: string;
          }
      >({
        path: `/subnets`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Returns every validator registered on the specified subnet with their hotkey, current stake, and trailing 30-day APY.
     *
     * @tags Subnets
     * @name ListSubnetValidators
     * @summary List validators for a subnet
     * @request GET:/subnets/{netuid}/validators
     */
    listSubnetValidators: (netuid: string, params: RequestParams = {}) =>
      this.request<
        {
          /** Validator hotkey in ss58 format. */
          hotkey: string;
          /** Validator stake value. */
          stake: number;
          /** Validator 30-day APY value when available. */
          thirty_day_apy: number | null;
        }[],
        | {
            error: {
              /** Error code. */
              code: "rate_limited";
              /** Human-readable message. */
              message: string;
            };
          }
        | {
            /** Machine-readable error reason. */
            error: string;
          }
      >({
        path: `/subnets/${netuid}/validators`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  validators = {
    /**
     * @description Returns every registered Bittensor validator with identity, stake, nominator count, active subnet count, and global rank.
     *
     * @tags Validators
     * @name ListValidators
     * @summary List all global validators
     * @request GET:/validators
     */
    listValidators: (params: RequestParams = {}) =>
      this.request<
        {
          /** Validator hotkey in ss58 format. */
          hotkey: string;
          /** Validator coldkey in ss58 format. */
          coldkey: string;
          /** Validator display name when available. */
          name: string | null;
          /** Validator global weighted stake value. */
          global_weighted_stake: string;
          /** Total number of global nominators. */
          global_nominators: number;
          /** Count of active subnets for the validator. */
          active_subnets: number;
          /** Current validator rank. */
          rank: number;
        }[],
        | {
            error: {
              /** Error code. */
              code: "rate_limited";
              /** Human-readable message. */
              message: string;
            };
          }
        | {
            /** Machine-readable error reason. */
            error: string;
          }
      >({
        path: `/validators`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
}
