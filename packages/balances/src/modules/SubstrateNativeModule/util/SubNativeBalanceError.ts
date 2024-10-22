export class SubNativeBalanceError extends Error {
  #tokenId: string

  constructor(tokenId: string, message: string) {
    super(`${tokenId}: ${message}`)
    this.name = "SubNativeBalanceError"
    this.#tokenId = tokenId
  }

  get tokenId() {
    return this.#tokenId
  }
}
