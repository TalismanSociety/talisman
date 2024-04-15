/**
 * This module is largely copied from https://github.com/0xKheops/substrate-metadata-explorer/tree/4b5a991e5ced45cad3b8675ff9104b8366d20429/packages/sme-codegen
 *
 * The primary difference between this module and `sme-codegen` is in the output.
 *
 * The `sme-codegen` module exports typescript code as a string, which can then be interpretted in order to construct subshape objects.
 *
 * Whereas this module directly exports the subshape objects described by that code.
 */

export * from "./getShape"
export * from "./getTypeName"
