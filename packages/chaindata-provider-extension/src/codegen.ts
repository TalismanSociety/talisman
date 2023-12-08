import { resolve } from "path"

import { CodegenConfig } from "@graphql-codegen/cli"

import { graphqlUrl } from "./constants"

const codegenOutputDir = `${resolve(__dirname, "graphql-codegen")}/`
const config: CodegenConfig = {
  schema: graphqlUrl,
  documents: ["src/**/*.ts", "!src/graphql-codegen/**/*"],
  ignoreNoDocuments: true,
  generates: {
    [codegenOutputDir]: {
      preset: "client",
      presetConfig: {
        // Fixes fragment types
        fragmentMasking: false,
      },
      config: {
        // This will cause the generator to avoid using TypeScript optionals (`?`) on types.
        avoidOptionals: { field: true },
        // Generates enum as TypeScript string union `type` instead of an `enum`.
        enumsAsTypes: true,
        // Does not add `__typename` to the generated types, unless it was specified in the selection set.
        skipTypename: true,
        // If scalars are found in the schema that are not defined in `scalars` an error will be thrown during codegen.
        strictScalars: true,
        // Custom scalar definitions
        scalars: {
          // defaults to `any` - let's go with `unknown` instead :)
          JSON: "unknown",
        },
        useTypeImports: true,
      },
      hooks: { afterAllFileWrite: ["prettier --write"] },
    },
  },
}

export default config
