// TODO: Move these elsewhere
export type Address = string
export type AddressesByToken<TTokenType extends { id: string }> = Record<
  TTokenType["id"],
  Address[]
>
