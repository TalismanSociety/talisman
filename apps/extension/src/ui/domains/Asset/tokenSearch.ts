export const getSearchTerms = (search: string): string[] =>
  search
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)

export const matchesSearchTerms = (
  searchTerms: string[],
  searchableValues: Array<string | null | undefined>
): boolean => {
  if (!searchTerms.length) return true

  const searchable = searchableValues
    .filter((value): value is string => !!value)
    .join(" ")
    .toLowerCase()

  return searchTerms.every((term) => searchable.includes(term))
}
