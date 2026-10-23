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
     * @description Returns, per subnet, what a set of coldkeys hold now, its average-cost basis, and their unrealized and realized profit and loss and staking income.
     *
     * @tags Accounts
     * @name GetAccountsPnl
     * @summary Get staking PnL for a set of accounts
     * @request GET:/accounts/pnl
     */
    getAccountsPnl: (
      query: {
        /** Comma-separated SS58 coldkeys, 1 to 10. Order and duplicates don't matter. */
        addresses: string;
        /** Only return this subnet. Omit for every subnet the accounts hold or have held. */
        netuid?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** Block height the holdings are read at. */
          height: number;
          /** TAO price in USD at that block. */
          tao_usd: number | null;
          /** True when part of the response is the last copy kept because a fresh read failed. fetched_at says how old the holdings are. */
          stale: boolean;
          /** When the holdings were read, ISO 8601. */
          fetched_at: string;
          /** True while some account's history is still being read for the first time: ask again shortly for more complete figures. */
          syncing: boolean;
          /** One entry per subnet the requested accounts hold or have held, ascending netuid. Subnet figures sum the accounts' figures; a subnet's cost figures are null unless every account's are known. */
          subnets: {
            /** Subnet identifier. 0 is the root subnet. */
            netuid: number;
            /** Current price of one alpha in TAO. Null when no requested account holds the subnet. */
            price_tao: number | null;
            /** Alpha held now, in units of the subnet's token (TAO on the root subnet). */
            alpha: number;
            /** Value of the alpha held at the current subnet price. In TAO. Null when unknown. */
            value_tao: number | null;
            /** value_tao at the current TAO price. In USD. Null when unknown. */
            value_usd: number | null;
            /** TAO paid for the alpha held, on an average-cost basis: a sale releases the cost of the share of the position it sells, and staking rewards carry no cost. In TAO. Null when unknown. */
            cost_basis_tao: number | null;
            /** Cost basis per alpha held. In TAO. Null when unknown. */
            average_entry_price_tao: number | null;
            /** value_tao minus cost_basis_tao. In TAO. Null when unknown. */
            unrealized_pnl_tao: number | null;
            /** unrealized_pnl_tao at the current TAO price. In USD. Null when unknown. */
            unrealized_pnl_usd: number | null;
            /** unrealized_pnl_tao / cost_basis_tao as a fraction: 0.064 is +6.4%. Null when unknown or the cost basis is zero. */
            unrealized_pnl_ratio: number | null;
            /** Gain on everything sold since the first purchase. In TAO. Null when unknown. */
            realized_pnl_tao: number | null;
            /** realized_pnl_tao, each sale at the TAO price of its own time. In USD. Null when unknown. */
            realized_pnl_usd: number | null;
            /** Staking rewards received, valued at the subnet price when they were seen: emission credits at their own block, other reward growth at the next change of the position or now. In TAO. Null when unknown. */
            income_tao: number | null;
            /** income_tao in USD. In USD. Null when unknown. */
            income_usd: number | null;
            /** False when the cost figures are unknown: the position's history is still being read, or holds something that can't be valued (stake swapped in from another coldkey, an unstake with no trade on record, root stake). The cost, PnL and income fields are then null. */
            complete: boolean;
            /** The same figures per requested account that holds or has held the subnet. */
            accounts: {
              /** Coldkey in SS58 format. */
              address: string;
              /** Alpha held now, in units of the subnet's token (TAO on the root subnet). */
              alpha: number;
              /** Value of the alpha held at the current subnet price. In TAO. Null when unknown. */
              value_tao: number | null;
              /** value_tao at the current TAO price. In USD. Null when unknown. */
              value_usd: number | null;
              /** TAO paid for the alpha held, on an average-cost basis: a sale releases the cost of the share of the position it sells, and staking rewards carry no cost. In TAO. Null when unknown. */
              cost_basis_tao: number | null;
              /** Cost basis per alpha held. In TAO. Null when unknown. */
              average_entry_price_tao: number | null;
              /** value_tao minus cost_basis_tao. In TAO. Null when unknown. */
              unrealized_pnl_tao: number | null;
              /** unrealized_pnl_tao at the current TAO price. In USD. Null when unknown. */
              unrealized_pnl_usd: number | null;
              /** unrealized_pnl_tao / cost_basis_tao as a fraction: 0.064 is +6.4%. Null when unknown or the cost basis is zero. */
              unrealized_pnl_ratio: number | null;
              /** Gain on everything sold since the first purchase. In TAO. Null when unknown. */
              realized_pnl_tao: number | null;
              /** realized_pnl_tao, each sale at the TAO price of its own time. In USD. Null when unknown. */
              realized_pnl_usd: number | null;
              /** Staking rewards received, valued at the subnet price when they were seen: emission credits at their own block, other reward growth at the next change of the position or now. In TAO. Null when unknown. */
              income_tao: number | null;
              /** income_tao in USD. In USD. Null when unknown. */
              income_usd: number | null;
              /** False when the cost figures are unknown: the position's history is still being read, or holds something that can't be valued (stake swapped in from another coldkey, an unstake with no trade on record, root stake). The cost, PnL and income fields are then null. */
              complete: boolean;
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
     * @description Which subnets the next subnet registrations would prune. Once the network holds SubnetLimit subnets, each new registration prunes the subnet past its immunity period with the lowest moving (EMA) alpha price.
     *
     * @tags Subnets
     * @name GetSubnetDeregistrationRisk
     * @summary Subnet deregistration risk
     * @request GET:/subnets/deregistration-risk
     */
    getSubnetDeregistrationRisk: (params: RequestParams = {}) =>
      this.request<
        {
          /** Finalized block the figures were read at. */
          block: number;
          network: {
            /** Registered subnets, root excluded. */
            subnet_count: number;
            /** SubnetLimit: the most subnets the network holds. */
            subnet_limit: number;
            /** Registrations possible before one has to prune a subnet. */
            free_slots: number;
            /** True when the next subnet registration prunes an existing subnet. False while slots are free, and while every subnet is immune: a registration that would need to prune is then rejected. */
            prunes_on_next_registration: boolean;
            /** The subnet the next registration would prune, as the runtime reports it; null when none would be. */
            prune_target_netuid: number | null;
            /** NetworkImmunityPeriod: blocks a new subnet is protected for. */
            immunity_period_blocks: number;
            /** NetworkRateLimit: blocks between subnet registrations. */
            registration_rate_limit_blocks: number;
            /** Block of the last subnet registration. */
            last_registration_block: number;
            /** First block a new subnet can register at. */
            next_registration_block: number;
            /** True when a subnet can register now: the rate limit has passed, and the network has a free slot or a subnet past its immunity period to prune. */
            registration_open_now: boolean;
            /** TAO a new subnet registration locks now. */
            registration_cost_tao: number;
          };
          /** Every registered subnet except root, ascending netuid. */
          subnets: {
            /** Subnet identifier (netuid). */
            netuid: number;
            /** Block the subnet was registered at. */
            registered_at_block: number;
            /** True while the subnet is inside its network immunity period and cannot be pruned. */
            immune: boolean;
            /** Block at which the immunity period ends (may be in the past). */
            immunity_ends_block: number;
            /** Seconds until the immunity period ends at 12 s per block; 0 once it has ended. */
            immunity_ends_in_seconds: number;
            /** The subnet's moving (EMA) alpha price in TAO, the value subnets are pruned by. */
            moving_price_tao: number;
            /** Position among prunable subnets, 1 being the next to go. Null while immune. */
            prune_rank: number | null;
            /** next: pruned by the next subnet registration. at_risk: among the 3 lowest-ranked prunable subnets, or immune for under 7 more days with a moving price below the 3rd-lowest prunable one. */
            risk: "next" | "at_risk" | "none";
            /** Why the subnet is at risk; null when it isn't. */
            risk_reason:
              | "lowest_moving_price"
              | "low_moving_price"
              | "immunity_ending";
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
        path: `/subnets/deregistration-risk`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Each subnet's price, pool reserves, market cap, 24-hour volume and emission, from Talisman's Bittensor indexer: pool reserves and emissions at its latest snapshot (every 100 blocks), prices at its tip.
     *
     * @tags Subnets
     * @name ListSubnetMarkets
     * @summary Every subnet's market
     * @request GET:/subnets/markets
     */
    listSubnetMarkets: (params: RequestParams = {}) =>
      this.request<
        {
          /** Block of the indexer snapshot the pool reserves and emissions come from. */
          block: number;
          /** Time of that snapshot block (ISO 8601). */
          timestamp: string;
          /** True when price_tao is the indexer's tip pool price; false when the tip prices were unavailable and the snapshot's are used. */
          tip_prices: boolean;
          /** Every subnet with a price, root excluded, ascending netuid. */
          subnets: {
            /** Subnet identifier (netuid). */
            netuid: number;
            /** Alpha price in TAO: the pool price at the indexer's tip, else at the snapshot. */
            price_tao: number;
            /** TAO in the subnet's pool. */
            tao_in: number;
            /** Alpha in the subnet's pool. */
            alpha_in: number;
            /** Alpha outstanding (staked), outside the pool. */
            alpha_out: number;
            /** price_tao × (alpha_in + alpha_out), in TAO. */
            market_cap_tao: number;
            /** TAO traded through the pool over the last 24 hours; null when unknown. */
            volume_24h_tao: number | null;
            /** The subnet's share of the TAO emitted to subnets over the last day (its pool injection plus the chain buy), in percent. */
            emission_pct: number;
            /** TAO emitted to the subnet over the last day. */
            emission_tao_per_day: number;
            /** Alpha emitted per day at the snapshot's rate (pool injection plus participants); null when the snapshot lacks it. */
            alpha_emission_per_day: number | null;
            /** SubnetMovingPrice (the EMA subnets are pruned by), in TAO; null when unknown. */
            moving_price_tao: number | null;
            /** Block the subnet was registered at. */
            registered_at_block: number | null;
            /** Whether the subnet receives emission. */
            emission_enabled: boolean;
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
        path: `/subnets/markets`,
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
