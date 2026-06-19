/**
 * Robust replacement for `error instanceof SomeErrorClass` when the class comes from a
 * package that gets bundled into multiple chunks/contexts (e.g. viem, @solana/web3.js).
 *
 * `instanceof` returns `false` whenever the error originates from a different bundled copy of
 * the module than the imported class reference — which silently broke Solana transfers (see
 * apps/extension/src/__tests__/no-instanceof-bundled-class.test.ts). An error's `.name` is
 * stable across copies, *provided the class sets it explicitly* (viem does:
 * `super({ name: 'ContractFunctionExecutionError' })`). For classes that don't set `.name`,
 * duck-type the shape instead.
 */
export const isErrorOfName = (error: unknown, ...names: string[]): boolean =>
  error instanceof Error && names.includes(error.name)
