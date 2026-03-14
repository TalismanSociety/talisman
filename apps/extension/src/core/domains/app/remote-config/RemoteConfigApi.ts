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
export class RemoteConfigApi<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  config = {
    /**
     * @description Returns the full Talisman wallet remote configuration including feature flags, swap settings, staking pools, ramp integrations, and more. This endpoint is consumed by the Talisman browser extension.
     *
     * @tags Remote Config
     * @name GetRemoteConfig
     * @summary Get wallet remote configuration
     * @request GET:/config
     */
    getRemoteConfig: (params: RequestParams = {}) =>
      this.request<
        {
          /** Ordered list of network IDs used to sort networks in the Manage Networks screen. Includes both Substrate chain IDs (e.g. 'polkadot') and EVM chain IDs (e.g. '1' for Ethereum) */
          recommendedNetworks: string[];
          /** Feature flags controlling which wallet features are enabled or disabled */
          featureFlags: {
            /** Shows the buy crypto button in the wallet */
            BUY_CRYPTO: boolean;
            /** Shows the transaction history link in the wallet */
            LINK_TX_HISTORY: boolean;
            /** Shows the staking link in the wallet */
            LINK_STAKING: boolean;
            /** Enables internationalization support */
            I18N: boolean;
            /** Enables the use of the OnFinality API key */
            USE_ONFINALITY_API_KEY: boolean;
            /** Enables the token swaps feature */
            SWAPS: boolean;
            /** Enables quest link in portfolio header */
            QUEST_LINK: boolean;
            /** Enables unified address banners on home page and copy address chain picker */
            UNIFIED_ADDRESS_BANNER: boolean;
            /** Enables transaction validation via risk analysis */
            RISK_ANALYSIS_V2: boolean;
            /** Enables the Autonomys quest banner */
            AUTONOMYS_QUEST_BANNER: boolean;
            /** Enables the NFTs v2 feature */
            NFTS_V2: boolean;
            /** Enables SEEK-based TAO fee discounts */
            SEEK_TAO_DISCOUNT: boolean;
            /** Enables SEEK token benefits features */
            SEEK_BENEFITS: boolean;
            /** Enables SEEK presale features */
            SEEK_PRESALE: boolean;
            /** Enables Blockaid phishing checks for dApps */
            BLOCKAID_DAPP_SCAN: boolean;
            /** Enables the Asset Hub migration banner */
            ASSET_HUB_MIGRATION_BANNER: boolean;
            /** Enables Bittensor MEV Shield protection */
            BITTENSOR_MEV_SHIELD: boolean;
          };
          /** CoinGecko price data proxy configuration */
          coingecko: {
            /**
             * CoinGecko proxy API base URL used for price data
             * @format uri
             */
            apiUrl: string;
            /** deprecated */
            apiKeyName?: string;
            /** deprecated */
            apiKeyValue?: string;
          };
          /** Token swap feature configuration including LI.FI, SimpleSwap, and StealthEX integrations */
          swaps: {
            /** deprecated */
            questApi?: string;
            /** API key for LI.FI cross-chain swap aggregator */
            lifiApiKey: string;
            /** Additional token IDs to enable in LI.FI that may not be available by default. Format: 'chainId:evm-erc20:contractAddress' */
            lifiTalismanTokens: string[];
            /** API key for SimpleSwap aggregator */
            simpleswapApiKey: string;
            /** API key for SimpleSwap aggregator with discounted rates */
            simpleswapApiKeyDiscounted: string;
            /** Currency symbols eligible for discounted SimpleSwap rates */
            simpleswapDiscountedCurrencies: string[];
            /** Token IDs displayed in the '🔥 Popular' section of the swap UI. Includes both legacy and new-format IDs for backward compatibility */
            curatedTokens: string[];
            /** Token IDs always shown at the top of the 'All tokens' and '🔥 Popular' buy sections */
            promotedBuyTokens: string[];
            /** Token IDs always shown at the top of the 'All tokens' and '🔥 Popular' sell sections */
            promotedSellTokens: string[];
            /** Map from token ID to custom Talisman fee amount (e.g. 0.2 = 0.2%). Tokens not listed use the default 0.2% fee */
            lifiCustomFeeTokens: Record<string, number>;
            /** SimpleSwap network and token ID mappings */
            simpleswap: {
              /** Maps provider network identifiers to Talisman network IDs (e.g. 'arbitrum' → '42161', 'sol' → 'solana-mainnet') */
              networks: Record<string, string>;
              /** Maps provider asset keys to Talisman token IDs for tokens that cannot be auto-resolved (native tokens, substrate tokens). E.g. 'dot' → 'polkadot-asset-hub:substrate-native' */
              tokens: Record<string, string>;
            };
            /** StealthEX network and token ID mappings */
            stealthex: {
              /** Maps provider network identifiers to Talisman network IDs (e.g. 'arbitrum' → '42161', 'sol' → 'solana-mainnet') */
              networks: Record<string, string>;
              /** Maps provider asset keys to Talisman token IDs for tokens that cannot be auto-resolved (native tokens, substrate tokens). E.g. 'dot' → 'polkadot-asset-hub:substrate-native' */
              tokens: Record<string, string>;
            };
            /** LI.FI-specific configuration for Solana chain handling */
            lifi: {
              /** LI.FI's internal chain ID for Solana */
              solanaChainId: number;
              /** Addresses that LI.FI uses to represent native SOL (system program and wrapped SOL) */
              solanaNativeAddresses: string[];
            };
          };
          /** Maps Substrate chain IDs to arrays of recommended nomination pool IDs for staking (e.g. 'polkadot-asset-hub': [282, 12, 16]) */
          nominationPools: Record<string, number[]>;
          /** Maps chain IDs to arrays of validator/staking pool addresses recommended for delegation */
          stakingPools: Record<string, string[]>;
          /** Links to external documentation resources */
          documentation: {
            /**
             * URL to the Polkadot unified address format documentation
             * @format uri
             */
            unifiedAddressDocsUrl: string;
          };
          /** Fiat on/off-ramp configuration for buying and selling crypto */
          ramps: {
            /** Ramp API key. Deprecated as of v3.1.13 — the key is now automatically included via the proxy at ramp-api.talisman.xyz */
            rampApiKey: string;
            /** Coinbase Onramp project ID */
            coinbaseProjectId: string;
            /** Token IDs pinned to the top of the ramp token selection. Includes both legacy and new-format IDs for backward compatibility */
            pinnedTokens: string[];
            /** Maps Ramp network identifiers (e.g. 'ETH', 'POLKADOT') to Talisman chain or evmNetwork IDs */
            rampNetworks: Record<string, string>;
          };
          /** SEEK token configuration including staking, discount tiers, and resource URLs */
          seek: {
            /** SEEK token ID on Ethereum mainnet (lowercased contract address) */
            tokenId: string;
            /**
             * URL to the SEEK staking page in the Talisman web app
             * @format uri
             */
            stakingUrl: string;
            /**
             * URL to the SEEK benefits documentation
             * @format uri
             */
            docsUrl: string;
            /**
             * URL to the documentation on how to acquire SEEK
             * @format uri
             */
            tradeUrl: string;
            /** EVM network ID where the SEEK staking contract is deployed */
            stakingContractNetworkId: string;
            /** Address of the SEEK staking smart contract on Ethereum mainnet */
            stakingContractAddress: string;
            /** Display string for the early staking reward boost (e.g. '420%') */
            stakingEarlyRewardBoost: string;
            /** Path in the Talisman web app to navigate to SEEK staking */
            webAppStakingPath: string;
            /** Ordered list of SEEK staking discount tiers, from lowest to highest */
            discountTiers: {
              /** Tier level (0 = no discount, higher = more discount) */
              tier: number;
              /** Minimum staked SEEK amount in wei (18 decimals) to qualify for this tier */
              min: string;
              /**
               * Discount multiplier for this tier (e.g. 0.05 = 5% discount, 0 = no discount)
               * @min 0
               * @max 1
               */
              discount: number;
            }[];
          };
          /** Earn/yield feature configuration for DeFi yield aggregation */
          earn: {
            /** Maps YieldXYZ network names (e.g. 'ethereum', 'arbitrum') to Talisman EVM network IDs. Used to match yield opportunities to supported networks */
            yieldxyzNetworks: Record<string, string>;
          };
          /** Bittensor network-specific configuration */
          bittensor: {
            /** Fee overrides for Bittensor subnet token transactions */
            fee: {
              /** Map from Bittensor subnet ID to custom fee amount for buy transactions. Empty/null means default fees apply */
              buy: Record<string, number> | null;
              /** Map from Bittensor subnet ID to custom fee amount for sell transactions. Empty/null means default fees apply */
              sell: Record<string, number> | null;
            };
          };
          /**
           * URL to send PostHog analytics events to
           * @format uri
           */
          postHogUrl: string;
        },
        any
      >({
        path: `/config`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
}
