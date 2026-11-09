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
 * Read-only REST API serving aggregated Bittensor network data — pools, subnets, validators, and price. All responses are JSON. Data is cached with stale-while-revalidate semantics.
 */
export class TaoDataApi<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  accounts = {
    /**
     * @description Returns, per subnet, the alpha a set of coldkeys held at the close of the latest processed UTC day, its average-cost basis, their realized profit and loss and their staking income. Unrealized PnL is the alpha held now at the current price, minus cost_basis_tao; the total PnL adds realized_pnl_tao and income_tao to it. With from_day, realized PnL and income are over the window from from_day to cost_basis_day, and each subnet's unrealized gain at its start is given so the change in it can be added.
     *
     * @tags Accounts
     * @name GetAccountsPnl
     * @summary Get the staking cost basis of a set of accounts
     * @request GET:/accounts/pnl
     */
    getAccountsPnl: (
      query: {
        /**
         * Comma-separated SS58 coldkeys, 1 to 10. Order and duplicates don't matter.
         * @pattern ^[1-9A-HJ-NP-Za-km-z]{46,48}(,[1-9A-HJ-NP-Za-km-z]{46,48})*$
         */
        addresses: string;
        /**
         * Only return this subnet, 0 to 65535. Omit for every subnet.
         * @pattern ^\d+$
         */
        netuid?: string;
        /**
         * The first UTC day (YYYY-MM-DD) of a window to report PnL over, through cost_basis_day. Omit for the PnL of the positions held at cost_basis_day.
         * @pattern ^\d{4}-\d{2}-\d{2}$
         */
        from_day?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** The UTC day (YYYY-MM-DD) whose close the figures are at, usually a day or two behind. Alpha bought, sold or received since then isn't in them until the next day closes. */
          cost_basis_day: string;
          /** The from_day asked for, or null for the positions held at cost_basis_day. */
          from_day: string | null;
          /** The requested accounts. One may be listed with no subnets when it holds no alpha (on `netuid`, when it is given). */
          accounts: {
            /** Coldkey in SS58 format. */
            address: string;
            /** One entry per subnet the account holds at the close of cost_basis_day, ascending netuid; with from_day, also per subnet held at the start of the window or traded or earned on during it. Only the subnet's current life counts: alpha held before a subnet was deregistered and registered again is left out. The cost and realized PnL fields are null together when part of the alpha has no known cost, and realized_pnl_usd is also null alone when a USD rate is unknown; the income fields are null only when the income is unknown. */
            subnets: {
              /** Subnet identifier. 0 is the root subnet. */
              netuid: number;
              /** Alpha held at the close of cost_basis_day, in units of the subnet's token (TAO on the root subnet). With from_day, 0 for a subnet sold out of during the window. */
              alpha: number;
              /** Cost of that alpha, on an average-cost basis: a purchase adds the TAO paid, staking income (income_tao) adds its value when received, and a sale releases the cost of the share of the position it sells. Growth of the alpha from its validator's stake pool growing adds no cost. In TAO. Null when unknown. */
              cost_basis_tao: number | null;
              /** Gain on everything sold from the first purchase to the close of cost_basis_day. With from_day, only on what was sold from from_day on. In TAO. Null when unknown. */
              realized_pnl_tao: number | null;
              /** realized_pnl_tao, each sale at the TAO price of its own time. In USD. Null when unknown. */
              realized_pnl_usd: number | null;
              /** Staking income (subnet emission, root dividends and root pool growth) received up to the close of cost_basis_day, valued when received; with from_day, only what was received from from_day on. That value is part of cost_basis_tao, so it isn't in the gain on the alpha held or in realized_pnl_tao: the total PnL is the unrealized gain plus realized_pnl_tao plus income_tao. In TAO. Null when unknown. */
              income_tao: number | null;
              /** income_tao in USD. In USD. Null when unknown. */
              income_usd: number | null;
              /** Only with from_day: the unrealized gain (value minus cost basis) on this subnet's alpha at the close of the day before from_day, 0 when none was held. The PnL over the window is the unrealized gain now, minus this, plus realized_pnl_tao and income_tao. In TAO. Null when unknown. */
              start_unrealized_pnl_tao?: number | null;
              /** Only with from_day: start_unrealized_pnl_tao in USD. In USD. Null when unknown. */
              start_unrealized_pnl_usd?: number | null;
            }[];
          }[];
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
        path: `/accounts/pnl`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),
  };
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
     * @description Returns the identity each subnet's owner has set on-chain: name, description, links and logo. Subnets without an identity are not listed.
     *
     * @tags Subnets
     * @name ListSubnetIdentities
     * @summary List subnet identities
     * @request GET:/subnets/identities
     */
    listSubnetIdentities: (params: RequestParams = {}) =>
      this.request<
        {
          /** Subnet identifier (netuid). */
          netuid: number;
          /** Subnet name set by its owner. Null when unset. */
          name: string | null;
          /** What the subnet does, in the owner's words. Null when unset. */
          description: string | null;
          /** Subnet website. Null when unset. */
          url: string | null;
          /** Source repository URL. Null when unset. */
          github_repo: string | null;
          /** Discord invite or handle. Null when unset. */
          discord: string | null;
          /** Owner contact. Null when unset. */
          contact: string | null;
          /** Logo image URL. Null when unset. */
          logo_url: string | null;
          /** Any other information the owner added. Null when unset. */
          additional: string | null;
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
        path: `/subnets/identities`,
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
          /** Validator 30-day APY before delegate take, when available. */
          thirty_day_apy_gross?: number | null;
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
          /** Validator 30-day APY on this subnet before delegate take, when available. */
          thirty_day_apy_gross?: number | null;
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
     * @description Deprecated — this endpoint will be removed soon. Returns the current TAO token price, market capitalization, 24-hour trading volume, circulating supply, and fully diluted market cap.
     *
     * @tags Price
     * @name GetPrice
     * @summary [Deprecated] Get current TAO price and market data
     * @request GET:/price
     * @deprecated
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
