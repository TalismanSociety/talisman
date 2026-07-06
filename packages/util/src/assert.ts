/**
 * @name assert
 * @description Throws an Error with the given message if the condition is falsy.
 * @example
 * assert(chain, "Chain not found")
 **/
export function assert(condition: unknown, message: string | (() => string)): asserts condition {
  if (condition) return
  throw new Error(typeof message === "function" ? message() : message)
}
