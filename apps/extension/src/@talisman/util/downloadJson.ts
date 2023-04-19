type TJson = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

const downloadJson = (json: TJson, name = "talisman") => {
  const blob = new Blob([JSON.stringify(json)], { type: "text/json" })
  const link = document.createElement("a")

  link.download = `${name}.json`
  link.href = window.URL.createObjectURL(blob)
  link.dataset.downloadurl = ["text/json", link.download, link.href].join(":")

  const evt = new MouseEvent("click", {
    view: window,
    bubbles: true,
    cancelable: true,
  })

  link.dispatchEvent(evt)
  link.remove()
}

export default downloadJson
