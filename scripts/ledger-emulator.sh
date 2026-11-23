#!/bin/sh
# Runs a Ledger device emulator (Speculos) in Docker and drives it over its REST API.
#
#   ledger-emulator.sh fetch-apps             get the pinned Ethereum, Polkadot and Solana app builds
#   ledger-emulator.sh apps-key               print the app builds, one per line (the key of a cache of them)
#   ledger-emulator.sh start [app|elf]        start the emulator (ethereum, polkadot, solana or a path)
#   ledger-emulator.sh stop                   remove the emulator container
#   ledger-emulator.sh status                 check Docker, the container and the API
#   ledger-emulator.sh screen                 print the text on the device screen
#   ledger-emulator.sh press <left|right|both>
#   ledger-emulator.sh press-until <regex> [max-presses]
#   ledger-emulator.sh approve                step through a review and sign it
#   ledger-emulator.sh reject                 step through a review and reject it
#   ledger-emulator.sh enable-blind-signing   turn on blind signing in the Ethereum app
#   ledger-emulator.sh disable-blind-signing  turn it off again
#   ledger-emulator.sh apdu <hex>             send one APDU, print the response hex
#   ledger-emulator.sh eth-address [index]    print the address at m/44'/60'/0'/0/<index>
#   ledger-emulator.sh screenshot <file.png>
#
# The recovery phrase comes from LEDGER_TEST_MNEMONIC in the environment, else from
# apps/extension/.env. Speculos takes it as an argument, so it can be visible in the
# Docker host's process listing while the emulator runs: use a throwaway phrase.
# See docs/ledger-emulator.md.
set -eu

# Pins. The device apps and both images change only when these lines do.
ETH_APP_VERSION=1.23.0
POLKADOT_APP_COMMIT=e36ced75060a7248903c4b1586839d2ddfe8021c
SOLANA_APP_COMMIT=af6ed454f0ed39cad8a5e1bca544ced18350a403
IMAGE=${SPECULOS_IMAGE:-ghcr.io/ledgerhq/speculos@sha256:56c7ec84c903147dac28e68706d3241218a3d9beb9562dd4a8c02947b2a24f47}
BUILDER_IMAGE=${LEDGER_APP_BUILDER_IMAGE:-ghcr.io/ledgerhq/ledger-app-builder/ledger-app-builder-lite@sha256:45ec491f28489aa0337eea8d50e9962a700ed41054081ee1b639bc1b128e6a32}
MODEL=${SPECULOS_MODEL:-nanox}
# macOS AirPlay Receiver listens on 5000, which is Speculos's default API port.
PORT=${SPECULOS_API_PORT:-5001}
CONTAINER=${SPECULOS_CONTAINER:-talisman-speculos}
APPS_DIR=${LEDGER_APPS_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/talisman/ledger-apps}
API=http://127.0.0.1:$PORT
ROOT=$(cd "$(dirname "$0")/.." && pwd)

die() {
  echo "ledger-emulator: $*" >&2
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required"
}

api() {
  method=$1
  path=$2
  shift 2
  curl -fsS -X "$method" "$API$path" -H 'content-type: application/json' "$@"
}

screen_text() {
  api GET '/events?currentscreenonly=true' | jq -r '[.events[].text | gsub("^\\s+|\\s+$"; "")] | join(" | ")'
}

press() {
  case $1 in
    left | right | both) ;;
    *) die "press takes left, right or both" ;;
  esac
  api POST "/button/$1" -d '{"action":"press-and-release"}' >/dev/null
  # The screen events lag the button press by a frame or two.
  sleep 0.3
}

press_until() {
  pattern=$1
  max=${2:-20}
  i=0
  while ! screen_text | grep -Eiq -- "$pattern"; do
    [ "$i" -lt "$max" ] || die "no screen matched /$pattern/ after $max presses (now: $(screen_text))"
    press right
    i=$((i + 1))
  done
  screen_text
}

load_mnemonic() {
  if [ -z "${LEDGER_TEST_MNEMONIC:-}" ] && [ -f "$ROOT/apps/extension/.env" ]; then
    LEDGER_TEST_MNEMONIC=$(tr -d '\r' <"$ROOT/apps/extension/.env" |
      sed -n 's/^[[:space:]]*\(export[[:space:]][[:space:]]*\)\{0,1\}LEDGER_TEST_MNEMONIC=//p' |
      tail -n 1 | sed -e 's/^["'\'']//' -e 's/["'\'']$//')
  fi
  if [ -n "${LEDGER_TEST_MNEMONIC:-}" ]; then
    words=$(printf '%s\n' "$LEDGER_TEST_MNEMONIC" | wc -w | tr -d ' ')
    case $words in
      12 | 18 | 24) ;;
      *) die "LEDGER_TEST_MNEMONIC has $words words; a recovery phrase has 12, 18 or 24" ;;
    esac
  else
    echo "ledger-emulator: LEDGER_TEST_MNEMONIC is not set, using the Speculos default seed" >&2
    LEDGER_TEST_MNEMONIC="glory promote mansion idle axis finger extra february uncover one trip resource lawn turtle enact monster seven myth punch hobby comfort wild raise skin"
  fi
  export LEDGER_TEST_MNEMONIC
}

# Ledger's app builds name the Nano S Plus "nanos2"; Speculos calls it "nanosp".
build_model() {
  case $MODEL in
    nanosp) echo nanos2 ;;
    *) echo "$MODEL" ;;
  esac
}

# A build depends on the builder image as much as on the commit: the image holds the SDK.
builder_id() {
  printf '%s' "$BUILDER_IMAGE" | cksum | cut -d ' ' -f 1
}

elf_for() {
  case $1 in
    ethereum) echo "$APPS_DIR/ethereum-$ETH_APP_VERSION/app-$ETH_APP_VERSION-$(build_model).elf" ;;
    polkadot) echo "$APPS_DIR/polkadot-$POLKADOT_APP_COMMIT-builder-$(builder_id)/$(build_model).elf" ;;
    solana) echo "$APPS_DIR/solana-$SOLANA_APP_COMMIT-builder-$(builder_id)/$(build_model).elf" ;;
    *.elf) echo "$1" ;;
    *) die "unknown app '$1': pass ethereum, polkadot, solana or the path to an .elf" ;;
  esac
}

apps_key() {
  for app in ethereum polkadot solana; do
    elf=$(elf_for "$app")
    echo "${elf#"$APPS_DIR"/}"
  done
}

fetch_apps() {
  elf=$(elf_for ethereum)
  if [ ! -f "$elf" ]; then
    need curl
    mkdir -p "$(dirname "$elf")"
    curl -fsSL -o "$elf.part" \
      "https://github.com/LedgerHQ/app-ethereum/releases/download/$ETH_APP_VERSION/$(basename "$elf")" ||
      die "could not download the Ethereum app $ETH_APP_VERSION for $(build_model)"
    mv "$elf.part" "$elf"
  fi
  echo "ethereum $ETH_APP_VERSION: $elf"
  # The Polkadot app builds in app/, the Solana app at the root of its repository.
  build_app polkadot "$POLKADOT_APP_COMMIT" app
  build_app solana "$SOLANA_APP_COMMIT" .
}

# build_app <app> <commit> <build directory>
#
# The Polkadot and Solana apps publish no release builds, and GitHub deletes the builds their
# CI uploads after 90 days. So this compiles LedgerHQ/app-<app> at a pinned commit, in Ledger's
# builder image, pinned by digest. It skips an app that is already built.
build_app() {
  app=$1
  commit=$2
  elf=$(elf_for "$app")
  if [ -f "$elf" ]; then
    echo "$app $commit: $elf"
    return
  fi
  need git
  need docker
  docker info >/dev/null 2>&1 || die "Docker is not running"
  case $(build_model) in
    nanox) sdk=NANOX_SDK ;;
    nanos2) sdk=NANOSP_SDK ;;
    stax) sdk=STAX_SDK ;;
    flex) sdk=FLEX_SDK ;;
    apex_p) sdk=APEX_P_SDK ;;
    *) die "no SDK in the builder image for model $MODEL" ;;
  esac
  src=$APPS_DIR/.build-$app
  rm -rf "$src"
  mkdir -p "$src" "$(dirname "$elf")"
  echo "building the $app app at $commit for $(build_model) ..." >&2
  git -C "$src" init -q
  git -C "$src" fetch -q --depth 1 "https://github.com/LedgerHQ/app-$app" "$commit" ||
    die "could not fetch LedgerHQ/app-$app at $commit"
  git -C "$src" checkout -q FETCH_HEAD
  # The Solana app names a submodule by its SSH URL, which needs a GitHub key: fetch it over HTTPS.
  git -C "$src" -c url.https://github.com/.insteadOf=git@github.com: \
    submodule update -q --init --recursive --depth 1
  # The builder runs as root by default, which would leave root-owned files in the cache.
  docker run --rm --user "$(id -u):$(id -g)" -v "$src":/app -w "/app/$3" "$BUILDER_IMAGE" \
    sh -c 'eval "make -j BOLOS_SDK=\$$1"' sh "$sdk" >"$src/build.log" 2>&1 ||
    die "the $app build failed, see $src/build.log"
  mv "$src/$3/build/$(build_model)/bin/app.elf" "$elf"
  rm -rf "$src"
  echo "$app $commit: $elf"
}

start() {
  need docker
  docker info >/dev/null 2>&1 || die "Docker is not running"
  elf=$(elf_for "${1:-ethereum}")
  if [ -n "$(docker ps -q -f "name=^$CONTAINER\$")" ]; then
    running=$(docker inspect -f '{{index .Config.Labels "talisman.elf"}} ({{index .Config.Labels "talisman.model"}})' "$CONTAINER")
    [ "$running" = "$elf ($MODEL)" ] || die "$CONTAINER is running $running; run stop first to start $elf ($MODEL)"
    echo "already running: $CONTAINER on $API"
    screen_text
    return
  fi
  [ -f "$elf" ] || die "$elf not found (run: pnpm ledger:emulator fetch-apps)"
  if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    die "port $PORT is in use; set SPECULOS_API_PORT"
  fi
  load_mnemonic
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker run --rm -d --name "$CONTAINER" \
    --label talisman.elf="$elf" \
    --label talisman.model="$MODEL" \
    -e LEDGER_TEST_MNEMONIC \
    -v "$(dirname "$elf")":/speculos/apps:ro \
    -p "127.0.0.1:$PORT:5000" \
    --entrypoint sh "$IMAGE" \
    -c 'exec speculos --model "$1" --display headless --seed "$LEDGER_TEST_MNEMONIC" "apps/$2"' \
    sh "$MODEL" "$(basename "$elf")" >/dev/null ||
    die "docker run failed (if port $PORT is in use, set SPECULOS_API_PORT)"
  i=0
  until api GET /events >/dev/null 2>&1; do
    [ "$i" -lt 60 ] || die "the API did not answer on $API within 60s (docker logs $CONTAINER)"
    sleep 1
    i=$((i + 1))
  done
  echo "started: $CONTAINER ($MODEL, $(basename "$elf")) on $API"
  screen_text
}

status() {
  ok=0
  if docker info >/dev/null 2>&1; then echo "PASS docker"; else echo "FAIL docker: not running" && ok=1; fi
  if [ -n "$(docker ps -q -f "name=^$CONTAINER\$" 2>/dev/null)" ]; then echo "PASS container $CONTAINER"; else echo "FAIL container $CONTAINER: not running" && ok=1; fi
  if api GET /events >/dev/null 2>&1; then echo "PASS api $API: $(screen_text)"; else echo "FAIL api $API: no answer" && ok=1; fi
  return $ok
}

stop() {
  need docker
  if [ -z "$(docker ps -aq -f "name=^$CONTAINER\$" 2>/dev/null)" ]; then
    echo "not running: $CONTAINER"
    return
  fi
  docker rm -f "$CONTAINER" >/dev/null
  echo "stopped: $CONTAINER"
}

apdu() {
  [ -n "${1:-}" ] || die "apdu takes a hex string"
  api POST /apdu -d "{\"data\":\"$1\"}" | jq -r .data
}

# Decodes ASCII hex to text: this avoids depending on xxd, which not every system has.
hex_to_text() {
  awk '{
    for (i = 1; i < length($0); i += 2) {
      hi = index("0123456789abcdef", tolower(substr($0, i, 1))) - 1
      lo = index("0123456789abcdef", tolower(substr($0, i + 1, 1))) - 1
      printf "%c", hi * 16 + lo
    }
  }'
}

eth_address() {
  index=$(printf '%08x' "${1:-0}")
  response=$(apdu "e002000015058000002c8000003c8000000000000000$index")
  sw=$(printf '%s' "$response" | tail -c 4)
  [ "$sw" = 9000 ] || die "GET_PUBLIC_KEY returned status $sw (is the Ethereum app running?)"
  # Response: pubkey length, pubkey, address length, address as ASCII hex, status word.
  pubkey_len=$(printf '%d' "0x$(printf '%s' "$response" | cut -c1-2)")
  offset=$((2 + pubkey_len * 2 + 3))
  printf '0x%s\n' "$(printf '%s' "$response" | cut -c"$offset"-"$((offset + 79))" | hex_to_text)"
}

# set_blind_signing <Enabled|Disabled>
set_blind_signing() {
  # A refused transaction leaves this warning up until a button is pressed.
  if screen_text | grep -q 'Blind signing must'; then press both; fi
  press_until 'app is ready|App settings' 6 >/dev/null
  screen_text | grep -q 'App settings' || press right
  press both
  screen_text | grep -q "Blind signing.*$1" || press both
  screen_text | grep -q "Blind signing.*$1" || die "blind signing did not become $1 (now: $(screen_text))"
  echo "blind signing $1" | tr '[:upper:]' '[:lower:]'
  press_until '^Back$' 10 >/dev/null
  press both
  press left
  screen_text
}

case ${1:-} in
  start | status | screen | press | press-until | approve | reject | enable-blind-signing | disable-blind-signing | apdu | eth-address | screenshot)
    need curl
    need jq
    ;;
esac

case ${1:-} in
  fetch-apps) fetch_apps ;;
  apps-key) apps_key ;;
  start) start "${2:-}" ;;
  stop) stop ;;
  status) status ;;
  screen) screen_text ;;
  press)
    press "${2:-}"
    screen_text
    ;;
  press-until) press_until "${2:?press-until takes a regex}" "${3:-20}" ;;
  approve)
    # The Ethereum app opens a blind-signed review with a warning that both buttons accept.
    if screen_text | grep -q 'Blind signing ahead'; then press both; fi
    press_until '^(Sign|Accept|Approve)' 30 >/dev/null
    # The Polkadot app titles a screen inside its raw message review "Sign and Verify".
    if screen_text | grep -q '^Sign and Verify'; then
      press right
      press_until '^(Sign|Accept|Approve)' 30 >/dev/null
    fi
    screen_text
    press both
    screen_text
    ;;
  reject)
    press_until '^Reject' 30
    press both
    screen_text
    ;;
  enable-blind-signing) set_blind_signing Enabled ;;
  disable-blind-signing) set_blind_signing Disabled ;;
  apdu) apdu "${2:-}" ;;
  eth-address) eth_address "${2:-0}" ;;
  screenshot) api GET /screenshot -o "${2:?screenshot takes an output .png path}" && echo "${2}" ;;
  *)
    awk 'NR > 1 && !/^#/ { exit } NR > 1 { sub(/^# ?/, ""); print }' "$0"
    exit 1
    ;;
esac
