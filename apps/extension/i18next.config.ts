import { defineConfig } from "i18next-cli"

import { transDefaultsPlugin } from "./scripts/i18nextTransDefaults"
import {
  defaultNamespace,
  keySeparator,
  languages,
  namespaceSeparator,
  pluralSeparator,
} from "./src/common/i18nSharedConfig"

export default defineConfig({
  locales: Object.keys(languages),
  plugins: [transDefaultsPlugin()],
  extract: {
    // Markdown under src contains developer READMEs, not translated UI content.
    input: ["src/**/*.{ts,tsx}"],
    // Keep the existing staging path consumed by the SimpleLocalize upload in CI.
    // Downloaded translations in public/locales are managed separately.
    output: ".i18next-parser/locales/{{language}}/{{namespace}}.json",
    defaultNS: defaultNamespace,
    nsSeparator: namespaceSeparator,
    keySeparator,
    pluralSeparator,
    // The supplied value preserves the base English text for expanded plural keys.
    defaultValue: (key, _namespace, language, value) => (language === "en" ? (value ?? key) : ""),
  },
})
