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
 *
 * @type {typeof import('./metadata.js').mutateMetadata}
 */
module.exports.mutateMetadata = async (...args) => {
  // Note: This definition of mutateMetadata is a wrapper of the mutateMetadata from `import('./metadata.js')`.
  // This wrapper prevents the inner function from being bundled by webpack, vite, etc.

  // we do a just-in-time import here so that our frontend bundle of this module doesn't include the nodejs-dependent subsquid libraries
  //
  // if we do `import ('./metadata')` from a .ts file then tsc will convert the import into a commonjs `require`, which means the nodejs-only
  // subsquid libraries would be included in frontend bundles of this module (and cause havoc!)
  //
  // but if we compile to esm instead of commonjs, we can't use this library from our commonjs-based subsquid projects!
  //
  // solution: use this workaround to just-in-time import the module in a way that tsc won't convert it into a `require`
  //
  // https://github.com/microsoft/TypeScript/issues/43329#issuecomment-1234857456
  const { mutateMetadata } = await import(
    /* @vite-ignore */
    /* webpackIgnore: true */
    "./metadata.js"
  )

  if (typeof mutateMetadata !== "function")
    throw new Error("Failed to import mutateMetadata function")

  // function was successfully imported, now call it and return the output
  return await mutateMetadata(...args)
}
