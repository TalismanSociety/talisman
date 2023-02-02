/**
 * `PluginBalanceTypes` is a collection of plugin-provided balance definitions.
 *
 * By hacking declaration merging (typescript magic) we can add variants to this type from within other modules.
 *
 * For more details on this process, see:
 * - https://www.typescriptlang.org/docs/handbook/declaration-merging.html
 * - https://stackoverflow.com/a/58261244/3926156
 * - https://stackoverflow.com/a/56099769/3926156
 * - https://stackoverflow.com/a/56516998/3926156
 * - https://pqina.nl/blog/typescript-interface-merging-and-extending-modules/
 *
 * As a result, consumers of this api will have type information for the `BalanceJson` type
 * based on the selection of plugins they are using in their app.
 */
export interface PluginBalanceTypes {} // eslint-disable-line @typescript-eslint/no-empty-interface
