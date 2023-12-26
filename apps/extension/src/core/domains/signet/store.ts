export class SignetStore {
  requests: Map<string, () => void> = new Map()

  resolve(id: string) {
    const res = this.requests.get(id)
    if (res) {
      res()
      this.requests.delete(id)
    }
  }

  addRequest(id: string, resolve: () => void) {
    this.requests.set(id, resolve)
  }
}

export const signetStore = new SignetStore()
