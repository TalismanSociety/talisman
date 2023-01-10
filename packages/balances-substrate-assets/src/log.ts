import anylogger from "anylogger"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { name } = require("../package.json")
// import { name } from "../package.json"

export default anylogger(name)
