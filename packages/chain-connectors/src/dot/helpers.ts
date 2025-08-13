const twoSecondsMs = 2 * 1000
const twoMinutesMs = 2 * 60 * 1000

export class ExponentialBackoff {
  #minInterval: number
  #maxInterval: number
  #nextInterval = 0
  #active = true

  constructor(maxIntervalMs = twoMinutesMs, minIntervalMs = twoSecondsMs) {
    this.#minInterval = minIntervalMs
    this.#maxInterval = maxIntervalMs

    this.reset()
  }

  enable() {
    this.#active = true
  }
  disable() {
    this.#active = false
  }

  increase() {
    if (this.#nextInterval === 0) this.#nextInterval = 1
    this.#nextInterval = this.#capMax(this.#capMin(this.#nextInterval * 2))
  }
  decrease() {
    this.#nextInterval = this.#capMax(this.#capMin(this.#nextInterval / 2))
  }

  reset() {
    this.#nextInterval = this.#minInterval
  }
  resetTo(nextInterval: number) {
    this.#nextInterval = this.#capMax(this.#capMin(nextInterval))
  }
  resetToMax() {
    this.#nextInterval = this.#maxInterval
  }

  get isActive() {
    return this.#active
  }
  get next() {
    return this.#nextInterval
  }

  get isMin() {
    return this.#nextInterval === this.#minInterval
  }
  get isMax() {
    return this.#nextInterval === this.#maxInterval
  }

  #capMin(value: number) {
    return Math.max(this.#minInterval, value)
  }
  #capMax(value: number) {
    return Math.min(this.#maxInterval, value)
  }
}
