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
        }[],
        {
          error: {
            /** Machine-readable error code. */
            code: string;
            /** Human-readable error message. */
            message: string;
          };
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
     * @tags Deprecated
     * @name ListSubnets
     * @summary [Deprecated] List all Bittensor subnets
     * @request GET:/subnets
     * @deprecated
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
        {
          error: {
            /** Machine-readable error code. */
            code: string;
            /** Human-readable error message. */
            message: string;
          };
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
        {
          error: {
            /** Machine-readable error code. */
            code: string;
            /** Human-readable error message. */
            message: string;
          };
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
        {
          error: {
            /** Machine-readable error code. */
            code: string;
            /** Human-readable error message. */
            message: string;
          };
        }
      >({
        path: `/validators`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Returns every subnet a validator is registered on with their current stake and trailing 30-day APY.
     *
     * @tags Validators
     * @name ListValidatorSubnets
     * @summary List subnets for a validator
     * @request GET:/validators/{hotkey}/subnets
     */
    listValidatorSubnets: (hotkey: string, params: RequestParams = {}) =>
      this.request<
        {
          /** Subnet identifier (netuid) where this validator is active. */
          netuid: number;
          /** Validator stake value on this subnet. */
          stake: number;
          /** Validator 30-day APY on this subnet when available. */
          thirty_day_apy: number | null;
        }[],
        {
          error: {
            /** Machine-readable error code. */
            code: string;
            /** Human-readable error message. */
            message: string;
          };
        }
      >({
        path: `/validators/${hotkey}/subnets`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  price = {
    /**
     * @description Returns the current TAO token price, market capitalization, 24-hour trading volume, circulating supply, and fully diluted market cap.
     *
     * @tags Price
     * @name GetPrice
     * @summary Get current TAO price and market data
     * @request GET:/price
     */
    getPrice: (params: RequestParams = {}) =>
      this.request<
        {
          /** Current TAO price in USD. */
          price: string;
          /** Current market capitalization in USD. */
          market_cap: string;
          /** 24-hour trading volume in USD. */
          volume_24h: string;
          /** Current circulating supply of TAO. */
          circulating_supply: string;
          /** Fully diluted market capitalization in USD. */
          fully_diluted_market_cap: string;
        },
        {
          error: {
            /** Machine-readable error code. */
            code: string;
            /** Human-readable error message. */
            message: string;
          };
        }
      >({
        path: `/price`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
}
