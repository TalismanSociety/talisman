import { Abi } from "@polkadot/api-contract"
import { TypeRegistry } from "@polkadot/types"
import { ContractExecResult } from "@polkadot/types/interfaces"
import { AnyJson, TypeDef } from "@polkadot/types/types"
import { stringCamelCase } from "@polkadot/util"

/**
 * Decodes & unwraps outputs and errors of a given result, contract, and method.
 * Parsed error message can be found in `decodedOutput` if `isError` is true.
 * SOURCE: https://github.com/paritytech/contracts-ui (GPL-3.0-only)
 */
export function decodeOutput(
  { result }: Pick<ContractExecResult, "result" | "debugMessage">,
  registry: TypeRegistry,
  abi: Abi,
  method: string
): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any
  decodedOutput: string
  isError: boolean
} {
  let output
  let decodedOutput = ""
  let isError = true

  if (result.isOk) {
    const flags = result.asOk.flags.toHuman()
    isError = flags.includes("Revert")
    const abiMessage = getAbiMessage(abi, method)
    const returnType = abiMessage.returnType
    const returnTypeName = getReturnTypeName(returnType)
    const r = returnType
      ? registry.createTypeUnsafe(returnTypeName, [result.asOk.data]).toHuman()
      : "()"
    output = isOk(r) ? r.Ok : isErr(r) ? r.Err : r

    const errorText = isErr(output)
      ? typeof output.Err === "object"
        ? JSON.stringify(output.Err, null, 2)
        : output.Err?.toString() ?? "Error"
      : output !== "Ok"
      ? output?.toString() || "Error"
      : "Error"

    const okText = isOk(r)
      ? typeof output === "object"
        ? JSON.stringify(output, null, "\t")
        : output?.toString() ?? "()"
      : JSON.stringify(output, null, "\t") ?? "()"

    decodedOutput = isError ? errorText : okText
  } else if (result.isErr) {
    output = result.toHuman()

    let errorText
    if (
      isErr(output) &&
      typeof output.Err === "object" &&
      Object.keys(output.Err || {}).length &&
      typeof Object.values(output.Err || {})[0] === "string"
    ) {
      const [errorKey, errorValue] = Object.entries(output.Err || {})[0]
      errorText = `${errorKey}${errorValue}`
    }

    decodedOutput = errorText || "Error"
  }

  return {
    output,
    decodedOutput,
    isError,
  }
}

/**
 * Helper types & functions
 * SOURCE: https://github.com/paritytech/contracts-ui (GPL-3.0-only)
 */
type ContractResultErr = {
  Err: AnyJson
}

interface ContractResultOk {
  Ok: AnyJson
}

function isErr(o: ContractResultErr | ContractResultOk | AnyJson): o is ContractResultErr {
  return typeof o === "object" && o !== null && "Err" in o
}

function isOk(o: ContractResultErr | ContractResultOk | AnyJson): o is ContractResultOk {
  return typeof o === "object" && o !== null && "Ok" in o
}

function getReturnTypeName(type: TypeDef | null | undefined) {
  return type?.lookupName || type?.type || ""
}

function getAbiMessage(abi: Abi, method: string) {
  const abiMessage = abi.messages.find((m) => stringCamelCase(m.method) === stringCamelCase(method))
  if (!abiMessage) {
    throw new Error(`"${method}" not found in Contract`)
  }
  return abiMessage
}
