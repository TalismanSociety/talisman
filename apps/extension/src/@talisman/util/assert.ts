// eslint-disable-next-line @typescript-eslint/no-explicit-any
const assert = (condition: any, message: any) => {
  if (!condition) {
    throw new Error(typeof message === "function" ? message() : message)
  }
}

export default assert
