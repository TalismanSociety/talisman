import { describe, expect, test } from "vitest"

import {
  hexToNumber,
  hexToString,
  hexToU8a,
  isAsciiPrintable,
  numberToU8a,
  stringToU8a,
  u8aCmp,
  u8aConcat,
  u8aEq,
  u8aToHex,
  u8aToString,
  u8aToU8a,
  u8aUnwrapBytes,
  u8aWrapBytes,
} from "./bytes"

// expected values generated with @polkadot/util 14.0.3 — do not edit by hand
describe("bytes utils (polkadot-js parity)", () => {
  test("hexToU8a", () => {
    expect(hexToU8a("0x0102ff")).toEqual(new Uint8Array([1, 2, 255]))
    expect(hexToU8a("0x")).toEqual(new Uint8Array())
    expect(hexToU8a(null)).toEqual(new Uint8Array())
    // polkadot-js right-pads odd-length hex
    expect(hexToU8a("0xabc")).toEqual(new Uint8Array([171, 192]))
  })

  test("u8aToHex", () => {
    expect(u8aToHex(new Uint8Array([1, 2, 255]))).toBe("0x0102ff")
    expect(u8aToHex(new Uint8Array())).toBe("0x")
    expect(u8aToHex(null)).toBe("0x")
  })

  test("stringToU8a / u8aToString round-trip", () => {
    expect(stringToU8a("héllo")).toEqual(new Uint8Array([104, 195, 169, 108, 108, 111]))
    expect(u8aToString(stringToU8a("héllo"))).toBe("héllo")
    expect(u8aToString(null)).toBe("")
  })

  test("hexToString", () => {
    expect(hexToString("0x68656c6c6f")).toBe("hello")
  })

  test("hexToNumber", () => {
    expect(hexToNumber("0xff")).toBe(255)
    expect(hexToNumber("0x0100")).toBe(256)
    expect(hexToNumber(null)).toBeNaN()
  })

  test("numberToU8a", () => {
    expect(numberToU8a(0)).toEqual(new Uint8Array([0]))
    expect(numberToU8a(255)).toEqual(new Uint8Array([255]))
    expect(numberToU8a(256)).toEqual(new Uint8Array([1, 0]))
    expect(numberToU8a(65535)).toEqual(new Uint8Array([255, 255]))
  })

  test("u8aToU8a", () => {
    expect(u8aToU8a("0x0102")).toEqual(new Uint8Array([1, 2]))
    expect(u8aToU8a("hi")).toEqual(new Uint8Array([104, 105]))
    expect(u8aToU8a([5, 6])).toEqual(new Uint8Array([5, 6]))
    expect(u8aToU8a(null)).toEqual(new Uint8Array())
  })

  test("u8aConcat", () => {
    expect(u8aConcat(new Uint8Array([1]), "0x02", [3])).toEqual(new Uint8Array([1, 2, 3]))
  })

  test("u8aEq", () => {
    expect(u8aEq(new Uint8Array([1, 2]), "0x0102")).toBe(true)
    expect(u8aEq(new Uint8Array([1]), new Uint8Array([1, 0]))).toBe(false)
  })

  test("u8aCmp", () => {
    expect(u8aCmp("0x0102", "0x0102")).toBe(0)
    expect(u8aCmp("0x01", "0x02")).toBe(-1)
    expect(u8aCmp("0x02", "0x01")).toBe(1)
    expect(u8aCmp("0x0102", "0x01")).toBe(1)
  })

  test("isAsciiPrintable", () => {
    expect(isAsciiPrintable("hello")).toBe(true)
    expect(isAsciiPrintable("héllo")).toBe(false)
    // hex strings are decoded to bytes first (polkadot-js isAscii semantics)
    expect(isAsciiPrintable("0x68656c6c6f")).toBe(true) // "hello"
    expect(isAsciiPrintable("0x0102")).toBe(false) // control chars
    expect(isAsciiPrintable(new Uint8Array([104, 105]))).toBe(true)
    expect(isAsciiPrintable(new Uint8Array([104, 9]))).toBe(false) // tab is not printable in pjs
    expect(isAsciiPrintable(null)).toBe(false)
    expect(isAsciiPrintable("")).toBe(true)
  })

  test("u8aWrapBytes / u8aUnwrapBytes", () => {
    const wrapped = new Uint8Array([
      60, 66, 121, 116, 101, 115, 62, 104, 101, 108, 108, 111, 60, 47, 66, 121, 116, 101, 115, 62,
    ])
    expect(u8aWrapBytes("hello")).toEqual(wrapped)
    // wrapping is idempotent
    expect(u8aWrapBytes(u8aWrapBytes("hello"))).toEqual(wrapped)
    expect(u8aUnwrapBytes(u8aWrapBytes("hello"))).toEqual(new Uint8Array([104, 101, 108, 108, 111]))
  })
})
