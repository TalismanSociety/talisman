import { atom } from "jotai"

export const swapViewAtom = atom<"form" | "approve-erc20" | "confirm">("form")
