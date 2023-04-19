import "anylogger-loglevel"

import { DEBUG } from "@core/constants"
import loglevel from "loglevel"

if (DEBUG) loglevel.setLevel("info")
