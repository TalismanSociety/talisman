import "anylogger-loglevel"

import { DEBUG } from "@extension/shared"
import loglevel from "loglevel"

if (DEBUG) loglevel.setLevel("info")
