import type { mutateMetadata as MutateMetadata } from "./metadata"

// preconstruct will resolve this if statement at build time
// the first section will be included in the normal esm and cjs bundles of this module
// the second section will be included in the browser-specific esm bundle of this module
if (typeof window !== "object") {
  module.exports = {
    mutateMetadata: async (
      ...args: Parameters<typeof MutateMetadata>
    ): ReturnType<typeof MutateMetadata> => {
      // Note: This definition of mutateMetadata is a wrapper of the mutateMetadata from `import('./metadata')`.
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
      const { mutateMetadata } = await import("./metadata")

      if (typeof mutateMetadata !== "function")
        throw new Error("Failed to import mutateMetadata function")

      // function was successfully imported, now call it and return the output
      return await mutateMetadata(...args)
    },
  }
} else {
  module.exports = {
    mutateMetadata: () => {
      // eslint-disable-next-line no-console
      console.error(
        "mutateMetadata depends on nodejs internals and cannot be used in a browser environment"
      )
      return null
    },
  }
}
