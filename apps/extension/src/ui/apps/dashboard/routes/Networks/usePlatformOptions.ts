import { NetworkSchema } from "@talismn/chaindata-provider"
import type { TFunction } from "i18next"
import { startCase } from "lodash-es"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

const PlatformTypeOptionSchema = z.enum([
  "all",
  ...NetworkSchema.options.map((opt) => opt.shape.platform.value),
])

export type PlatformOption = z.infer<typeof PlatformTypeOptionSchema>

// the "polkadot" platform is internally named after the network type, but displayed as "Substrate" in the UI
export const getPlatformLabel = (platform: PlatformOption, t: TFunction) =>
  platform === "polkadot" ? t("Substrate") : startCase(platform)

export const usePlatformOptions = (defaultValue?: PlatformOption) => {
  const { t } = useTranslation()
  const [platform, setPlatform] = useState<PlatformOption>(() => {
    const value = PlatformTypeOptionSchema.safeParse(defaultValue)
    return value.success ? value.data : "all"
  })

  const platformOptions = useMemo(() => {
    return PlatformTypeOptionSchema.options
      .concat()
      .sort()
      .map((value) => ({
        value,
        label: getPlatformLabel(value, t),
      }))
  }, [t])

  return [platform, setPlatform, platformOptions] as const
}
