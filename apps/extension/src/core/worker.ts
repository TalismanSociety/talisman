import { log } from "@core/log"

self.onmessage = (e) => {
  log.log("[worker] received message", e.data)
  self.postMessage(["hello", "from", "worker"])
}

setTimeout(() => {
  log.log("[worker] sending loaded message")
  self.postMessage("worker loaded")
}, 2000)
