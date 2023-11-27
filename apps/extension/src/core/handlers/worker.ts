import { log } from "@core/log"

log.log("Loading worker", new URL("./worker.js", document.location.origin).href)

export const worker = new Worker(new URL("./worker.js", document.location.origin))

worker.addEventListener("message", (e) => {
  log.log("[backend] Message received from worker script", e.data)
})

worker.postMessage(["hello", "from", "background"])
