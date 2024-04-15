import "anylogger-loglevel"

import { DEBUG } from "extension-shared"
import loglevel from "loglevel"

loglevel.setLevel(DEBUG ? "info" : "silent")
