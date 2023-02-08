import type { mutateMetadata as mutateMetadataDef } from "./metadata"
type MutateMetadata = typeof mutateMetadataDef

/**
 * A function which allows you to decode, modify and then re-encode the type metadata for a chain.
 *
 * All of the encoding/decoding logic depends on the Codec implementation in the subsquid codebase
 * (@subsquid/substrate-metadata/src/codec.ts).
 * This subsquid implementation is capable of both decoding a blob of metadata as well as taking the
 * decoded metadata and re-encoding it back into its on-chain format.
 *
 * An example use-case for this function is for decoding balances on many chains.
 * Loading up the full ~0.5MB metadata blob for each chain just to decode the one balance type has
 * an unacceptable performance overhead on the frontend, which completely prevents us from doing
 * multi-chain balances.
 *
 * By filtering the full metadata blob down to just the types needed for balance decoding, we can
 * reduce the overhead by several orders of magnitude, solving the performance limitation.
 *
 * What's also neat is that with our filtered down metadata we are still free to use any of the
 * available SCALE decoding libraries on the frontend, as long as they can load up a metadata blob.
 */
export let mutateMetadata: MutateMetadata = async () => {
  // eslint-disable-next-line no-console
  console.error(
    "mutateMetadata depends on nodejs internals and cannot be used in a browser environment"
  )
  return null
}

// preconstruct will resolve this if statement at build time
// the interior will be included in the normal esm and cjs bundles of this module
// the interior will be dead-code eliminated in the browser-specific esm bundle of this module
if (typeof window !== "object") {
  mutateMetadata =
    // Note: This definition of mutateMetadata is a wrapper of the mutateMetadata from `import('./metadata')`.
    // This wrapper prevents the inner function from being bundled by frontend bundlers like webpack, vite, etc.
    async (...args) => {
      const { mutateMetadata: innerMutateMetadata } = await import(
        /* @vite-ignore */
        /* webpackIgnore: true */
        "./metadata"
      )

      if (typeof innerMutateMetadata !== "function")
        throw new Error("Failed to import mutateMetadata function")

      // function was successfully imported, now call it and return the output
      return await innerMutateMetadata(...args)
    }
}
