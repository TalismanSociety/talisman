import anylogger from "anylogger"

import packageJson from "../package.json"

export default anylogger(packageJson.name)
