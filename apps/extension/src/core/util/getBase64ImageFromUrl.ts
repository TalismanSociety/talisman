export const getBase64ImageFromUrl = async (url: string) => {
  const response = await fetch(url)
  const blob = await response.blob()

  return new Promise<string>((resolve, reject) => {
    var reader = new FileReader()
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
}
