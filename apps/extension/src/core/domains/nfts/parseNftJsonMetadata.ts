export type NftAttribute = { trait_type: string; value: string | number | boolean }

export type NftJsonMetadata = {
  name?: string
  description?: string
  image?: string
  animation_url?: string
  external_url?: string
  attributes?: NftAttribute[]
}

const MAX_NAME_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_ATTRIBUTES = 50
const MAX_ATTRIBUTE_LENGTH = 100

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const optionalString = (value: unknown, maxLength = Number.POSITIVE_INFINITY) =>
  typeof value === "string" ? value.slice(0, maxLength) : undefined

const truncateAttributeValue = (value: unknown): NftAttribute["value"] | undefined => {
  if (typeof value === "string") return value.slice(0, MAX_ATTRIBUTE_LENGTH)
  if (typeof value === "number" || typeof value === "boolean") return value
  return undefined
}

const parseAttributes = (value: unknown): NftAttribute[] | undefined => {
  if (!Array.isArray(value)) return undefined
  return value
    .flatMap((attribute) => {
      if (!isRecord(attribute)) return []
      const trait_type = optionalString(attribute.trait_type, MAX_ATTRIBUTE_LENGTH)
      const value = truncateAttributeValue(attribute.value)
      return trait_type !== undefined && value !== undefined ? [{ trait_type, value }] : []
    })
    .slice(0, MAX_ATTRIBUTES)
}

export const parseNftJsonMetadata = (value: unknown): NftJsonMetadata | null => {
  if (!isRecord(value)) return null
  return {
    name: optionalString(value.name, MAX_NAME_LENGTH),
    description: optionalString(value.description, MAX_DESCRIPTION_LENGTH),
    image: optionalString(value.image),
    animation_url: optionalString(value.animation_url),
    external_url: optionalString(value.external_url),
    attributes: parseAttributes(value.attributes ?? value.traits),
  }
}
