// biome-ignore-all lint/suspicious/noConsole: CLI script output

const SECRET_KEYS = new Set(["api_key", "webhookUrl"])

export const redactForPrint = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redactForPrint)
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        SECRET_KEYS.has(key) ? "<redacted>" : redactForPrint(v),
      ])
    )
  return value
}

const indent = (text: string, n: number) => text.replace(/^/gm, " ".repeat(n))

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

type Page<T> = { results?: T[]; next?: string | null }

export class PosthogApi {
  #nextFakeId = 100_000

  constructor(
    readonly host: string,
    readonly projectId: string,
    private readonly apiKey: string,
    readonly dryRun: boolean,
    private readonly verbose: boolean
  ) {}

  url(path: string) {
    return path.startsWith("http") ? path : `${this.host}/api/projects/${this.projectId}${path}`
  }

  async #send<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = this.url(path)
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text()
    if (!res.ok)
      throw new HttpError(
        `${method} ${url} → HTTP ${res.status}\n${text.slice(0, 2000)}`,
        res.status
      )
    return (text ? JSON.parse(text) : null) as T
  }

  async #write<T>(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
    const printBody = () =>
      body !== undefined && console.log(indent(JSON.stringify(redactForPrint(body), null, 2), 4))
    if (this.dryRun) {
      console.log(`  [dry-run] ${method} ${this.url(path)}`)
      if (this.verbose) printBody()
      return { id: this.#nextFakeId++, ...(body as object) } as T
    }
    if (this.verbose) {
      console.log(`  ${method} ${this.url(path)}`)
      printBody()
    }
    return this.#send<T>(method, path, body)
  }

  get<T>(path: string) {
    return this.#send<T>("GET", path)
  }
  post<T>(path: string, body: unknown) {
    return this.#write<T>("POST", path, body)
  }
  patch<T>(path: string, body: unknown) {
    return this.#write<T>("PATCH", path, body)
  }
  delete(path: string) {
    return this.#write<null>("DELETE", path)
  }

  /** Writes nothing, so a dry run sends it. */
  query<T>(source: unknown) {
    return this.#send<T>("POST", "/query/", { query: source })
  }

  async listAll<T>(path: string): Promise<T[]> {
    const results: T[] = []
    let next: string | null | undefined = this.url(path)
    while (next) {
      const page: Page<T> = await this.get<Page<T>>(next)
      results.push(...(page.results ?? []))
      next = page.next
    }
    return results
  }
}

export const ingest = async (host: string, projectToken: string, batch: readonly unknown[]) => {
  const res = await fetch(`${host.replace(/(\/batch)?\/*$/, "")}/batch/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: projectToken, historical_migration: false, batch }),
  })
  if (!res.ok)
    throw new HttpError(
      `POST ${host}/batch/ → HTTP ${res.status}\n${(await res.text()).slice(0, 500)}`,
      res.status
    )
}
