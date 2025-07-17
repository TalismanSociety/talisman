import { getAccountPlatformFromAddress, normalizeAddress } from "@talismn/crypto"
import md5 from "blueimp-md5"
import Color from "color"
import { useId, useMemo } from "react"

const djb2 = (str: string) => {
  let hash = 5381
  for (let i = 0; i < str.length; i++) hash = (hash << 5) + hash + str.charCodeAt(i)
  return hash
}

const valueFromHash = (hash: string, max: number) => {
  return (max + djb2(hash)) % max
}

const colorFromHash = (hash: string) => {
  const hue = valueFromHash(hash, 360)
  return Color.hsv(hue, 100, 100)
}

const rotateText = (text: string, nbChars = 0) => text.slice(nbChars) + text.slice(0, nbChars)

export const useTalismanOrb = (seed: string) => {
  const id = useId()

  return useMemo(() => {
    try {
      // those break if seed is empty or an invalid address

      // eslint-disable-next-line no-var
      var platform = getAccountPlatformFromAddress(seed)

      // seed may be specific to a ss58 prefix, get the base address
      // eslint-disable-next-line no-var
      var address = normalizeAddress(seed)
    } catch (err) {
      platform = "polkadot"
      address = seed
    }

    // derive 3 hashs from the seed, used to generate the 3 colors
    const hash1 = md5(address)
    const hash2 = rotateText(hash1, 1)
    const hash3 = rotateText(hash1, 2)

    // the 2 darkest ones will be used as gradient BG
    // the lightest one will be used as gradient circle, to mimic a 3D lighting effect
    const colors = [colorFromHash(hash1), colorFromHash(hash2), colorFromHash(hash3)].sort(
      (c1, c2) => c1.lightness() - c2.lightness(),
    )

    // random location in top left corner, avoid beeing to close from the center
    const dotX = 10 + valueFromHash(hash1, 10)
    const dotY = 10 + valueFromHash(hash2, 10)

    // global rotation
    const rotation = valueFromHash(hash1, 360)

    return {
      id, //multiple avatars should cohabit on the same page
      bgColor1: colors[0].hex(),
      bgColor2: colors[1].hex(),
      glowColor: colors[2].hex(),
      transform: `rotate(${rotation} 32 32)`,
      cx: dotX,
      cy: dotY,
      platform,
    }
  }, [id, seed])
}
