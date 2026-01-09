// Runtime i18n configuration values
// These are kept in sync with i18next-parser.config.cjs which is used by the i18next-parser CLI

// The key is the `locale` as passed to i18next.
// The value is the `human-readable name` as passed to the language settings UI in the wallet.
// This config is only used for development builds - production builds fetch from SimpleLocalize.
export const languages: Record<string, string> = { en: "English" }

// use `common` instead of `translation` as the default namespace
export const defaultNamespace = "common"

// natural language keys
export const namespaceSeparator = false
export const keySeparator = false
export const pluralSeparator = "_pluralSeparator_"
