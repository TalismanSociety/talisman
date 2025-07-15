import { NetworkSchema } from "@talismn/chaindata-provider"
import { startCase } from "lodash-es"
import { useMemo, useState } from "react"
import { z } from "zod/v4"

const PlatformTypeOptionSchema = z.enum([
  "all",
  ...NetworkSchema.options.map((opt) => opt.shape.platform.value),
])

export type PlatformOption = z.infer<typeof PlatformTypeOptionSchema>

export const usePlatformOptions = (defaultValue?: PlatformOption) => {
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
        label: startCase(value),
      }))
  }, [])

  return [platform, setPlatform, platformOptions] as const
}
