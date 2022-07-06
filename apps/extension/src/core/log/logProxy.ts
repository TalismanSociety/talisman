// get a hold of debug method in case dapp replaces it on load
// eslint-disable-next-line no-console
const safeDebug = console.debug

const cloneObject = (target: any) => {
  let keys = Object.keys(target)
  let obj: Record<string, unknown> = {}
  keys.forEach((key) => {
    obj[key] = target[key]
  })
  return obj
}

const handler: ProxyHandler<any> = {
  get: (target, name, receiver) => {
    const obj = cloneObject(target)

    if (typeof target[name] === "function") {
      safeDebug(`[Proxy ${target.constructor.name} - Calling Method: ${String(name)}`) //, obj)
      return new Proxy(target[name], {
        apply: (target, thisArg, argumentsList) => {
          safeDebug(
            `[Proxy ${target.constructor.name} - Method: ${String(name)}`,
            thisArg,
            argumentsList
          )
          return Reflect.apply(target, thisArg, argumentsList)
        },
      })
    } else
      safeDebug(
        `[Proxy ${target.constructor.name} - Reading Property: ${String(name)}`,
        obj.hasOwnProperty(String(name)) ? obj[String(name)] : "MISSING PROPERTY"
      )

    return Reflect.get(target, name, receiver)
  },
  set: (target, prop, val) => {
    target[prop] = val
    const obj = cloneObject(target)
    safeDebug(`[Proxy ${target.constructor.name} - Updating "${String(prop)}"`, {
      prev: obj[String(prop)],
      next: val,
      obj,
    })
    return Reflect.set(target, prop, val)
  },
}

export const logProxy = (sourceObj: any) => {
  return new Proxy(sourceObj, handler)
}
