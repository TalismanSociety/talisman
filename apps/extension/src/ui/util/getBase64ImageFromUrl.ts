import { DEBUG } from "@extension/shared"

const getBase64ImageFromUrlRaw = async (url: string) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = function () {
        try {
          if (!reader.result) throw new Error("No result")
          const base64data = reader.result.toString()
          resolve(base64data)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    if (DEBUG) console.error(err)
    // can happen if image doesn't exist or if browser runs into a CORS issue
    return undefined
  }
}

// useful for firefox which considers svg size as 0px/0px if not specified
const getBase64ImageFromUrlSvgDefaultSize = async (
  url: string,
  size: {
    width: number
    height: number
  }
) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = function () {
        try {
          if (!reader.result) throw new Error("No result")
          const strSvg = reader.result as string

          if (!strSvg.startsWith("<svg")) throw new Error("Not an svg")

          const withDefaultSize = strSvg.replace(/^<svg([^>])*>/, (attributes) => {
            if (!attributes.includes("height="))
              attributes = attributes.replace("<svg ", `<svg height="${size.height}" `)
            if (!attributes.includes("width="))
              attributes = attributes.replace("<svg ", `<svg width="${size.width}" `)
            return attributes
          })

          const data = Buffer.from(withDefaultSize, "utf8").toString("base64")
          resolve(`data:image/svg+xml;base64,${data}`)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsText(blob)
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    if (DEBUG) console.error(err)
    // can happen if image doesn't exist or if browser runs into a CORS issue
    return undefined
  }
}

function isSvgUrl(url: string): boolean {
  const urlWithoutQueryOrAnchor = url.toLowerCase().split(/[?#]/)[0]
  const extension = urlWithoutQueryOrAnchor.split(".").pop()?.toLowerCase()
  return extension === "svg"
}

export const getBase64ImageFromUrl = async (
  url: string,
  defaultSvgSize?: {
    width: number
    height: number
  }
) => {
  return defaultSvgSize && isSvgUrl(url)
    ? getBase64ImageFromUrlSvgDefaultSize(url, defaultSvgSize)
    : getBase64ImageFromUrlRaw(url)
}
