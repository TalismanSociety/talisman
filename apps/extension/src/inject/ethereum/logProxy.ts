// get a hold of debug method in case dapp replaces it on load
// eslint-disable-next-line no-console
const safeConsoleDebug = console.debug

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const copyObject = (target: any) => {
  const keys = Object.keys(target)
  const obj: Record<string, unknown> = {}
  keys.forEach((key) => {
    obj[key] = target[key]
  })
  return obj
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler: ProxyHandler<any> = {
  get: (target, name, receiver) => {
    const obj = copyObject(target)

    if (typeof target[name] === "function") {
      return new Proxy(target[name], {
        apply: async (target, thisArg, argumentsList) => {
          try {
            const result = await Reflect.apply(target, thisArg, argumentsList)
            safeConsoleDebug(`[Proxy ${target.constructor.name} - Method: ${String(name)}`, {
              thisArg,
              argumentsList,
              result,
            })
            return result
          } catch (err) {
            safeConsoleDebug(`[Proxy ${target.constructor.name} - Method: ${String(name)}`, {
              thisArg,
              argumentsList,
              err,
            })
            throw err
          }
        },
      })
    } else if (typeof target[name] === "object") {
      safeConsoleDebug(
        `[Proxy ${target.constructor.name} - Reading Property: ${String(name)} => `,
        { result: obj[String(name)] }
      )
    } else
      safeConsoleDebug(
        `[Proxy ${target.constructor.name} - Reading Property: ${String(name)} => %s`,
        String(name) in obj ? String(obj[String(name)]) : "MISSING PROPERTY"
      )

    return Reflect.get(target, name, receiver)
  },
  set: (target, prop, val) => {
    target[prop] = val
    const obj = copyObject(target)
    safeConsoleDebug(`[Proxy ${target.constructor.name} - Updating "${String(prop)}"`, {
      prev: obj[String(prop)],
      next: val,
      obj,
    })
    return Reflect.set(target, prop, val)
  },
}

/* 
  Developer utility that traces all properties and method calls on the object.
  Significant performance hit, do not use in production.
*/
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logProxy = (sourceObj: any) => {
  const eventNames = ["connect", "disconnect", "chainChanged", "accountsChanged"]
  eventNames.forEach((eventName) => {
    sourceObj.on(eventName, (...args: unknown[]) => {
      safeConsoleDebug(`[Proxy callback : ${eventName}]`, ...args)
    })
  })

  return new Proxy(sourceObj, handler)
}
