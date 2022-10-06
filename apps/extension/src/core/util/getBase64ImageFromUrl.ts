import { DEBUG } from "@core/constants"

export const getBase64ImageFromUrl = async (url: string) => {
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
