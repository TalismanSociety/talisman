import "anylogger-loglevel"

import loglevel from "loglevel"

import { DEBUG } from "../constants"

if (DEBUG) loglevel.setLevel("info")
