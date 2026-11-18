#!/bin/sh
# Runs a Ledger device emulator (Speculos) in Docker and drives it over its REST API.
#
#   ledger-emulator.sh fetch-apps             download the Ethereum, Polkadot and Solana app builds
#   ledger-emulator.sh start [app|elf]        start the emulator (ethereum, polkadot, solana or a path)
#   ledger-emulator.sh stop                   remove the emulator container
#   ledger-emulator.sh status                 check Docker, the container and the API
#   ledger-emulator.sh screen                 print the text on the device screen
#   ledger-emulator.sh press <left|right|both>
#   ledger-emulator.sh press-until <regex> [max-presses]
#   ledger-emulator.sh approve                step through a review and sign it
#   ledger-emulator.sh reject                 step through a review and reject it
#   ledger-emulator.sh enable-blind-signing   turn on blind signing in the Ethereum app
#   ledger-emulator.sh apdu <hex>             send one APDU, print the response hex
#   ledger-emulator.sh eth-address [index]    print the address at m/44'/60'/0'/0/<index>
#   ledger-emulator.sh screenshot <file.png>
#
# The recovery phrase comes from LEDGER_TEST_MNEMONIC in the environment, else from
# apps/extension/.env. It reaches the container by variable name only, so it
# never appears on a host command line. See docs/ledger-emulator.md.
set -eu

ETH_APP_VERSION=1.23.0
IMAGE=${SPECULOS_IMAGE:-ghcr.io/ledgerhq/speculos:latest}
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

elf_for() {
  case $1 in
    ethereum) echo "$APPS_DIR/ethereum-$ETH_APP_VERSION/app-$ETH_APP_VERSION-$(build_model).elf" ;;
    polkadot | solana) echo "$APPS_DIR/$1/$(build_model)/bin/app.elf" ;;
    *.elf) echo "$1" ;;
    *) die "unknown app '$1': pass ethereum, polkadot, solana or the path to an .elf" ;;
  esac
}

fetch_apps() {
  need gh
  dir=$APPS_DIR/ethereum-$ETH_APP_VERSION
  mkdir -p "$dir"
  gh release download "$ETH_APP_VERSION" -R LedgerHQ/app-ethereum -D "$dir" -p 'app-*.elf' --skip-existing
  echo "ethereum $ETH_APP_VERSION: $dir"
  fetch_ci_app polkadot LedgerHQ/app-polkadot main compiled_app_binaries
  # compiled_app_binaries is built with TRUSTED_NAME_TEST_KEY=1, so it is the fallback.
  fetch_ci_app solana LedgerHQ/app-solana master guidelines_enforcer_app_binaries compiled_app_binaries
}

# fetch_ci_app <app> <repo> <branch> <artifact>...
#
# The Polkadot and Solana apps publish no release builds. Their CI uploads them on every push
# to the default branch as artifacts holding one <model>/bin/app.elf per device model, which
# GitHub deletes after 90 days. This takes the newest unexpired artifact of the first name
# that has one, in the order given, and records which run and artifact it came from, to skip
# an unchanged build.
#
# Only runs of the upstream repository's own push to the branch count: a pull request from a
# fork can name its branch the same.
fetch_ci_app() {
  app=$1
  repo=$2
  branch=$3
  shift 3
  run=
  artifact=
  for name in "$@"; do
    listing=$(gh api "repos/$repo/actions/artifacts?name=$name&per_page=30" \
      --jq ".artifacts[] | select(.expired == false and .workflow_run.head_branch == \"$branch\" and .workflow_run.head_repository_id == .workflow_run.repository_id) | \"\\(.created_at) \\(.workflow_run.id)\"") ||
      die "could not list the $name artifacts of $repo"
    for id in $(printf '%s\n' "$listing" | sort -r | cut -d ' ' -f 2); do
      if [ "$(gh api "repos/$repo/actions/runs/$id" --jq .event)" = push ]; then
        run=$id
        artifact=$name
        break 2
      fi
    done
  done
  [ -n "$run" ] || die "no unexpired $* artifact from a push to $repo $branch"
  dir=$APPS_DIR/$app
  if [ "$(cat "$dir/ci-build" 2>/dev/null)" = "$run $artifact" ]; then
    echo "$app (CI run $run, $artifact): $dir"
    return
  fi
  rm -rf "$dir"
  mkdir -p "$dir"
  gh run download "$run" -R "$repo" -n "$artifact" -D "$dir"
  echo "$run $artifact" >"$dir/ci-build"
  echo "$app (CI run $run, $artifact): $dir"
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

enable_blind_signing() {
  press_until 'app is ready|App settings' 6 >/dev/null
  screen_text | grep -q 'App settings' || press right
  press both
  if screen_text | grep -q 'Blind signing.*Disabled'; then press both; fi
  screen_text | grep -q 'Blind signing.*Enabled' || die "blind signing did not turn on (now: $(screen_text))"
  echo "blind signing enabled"
  press_until '^Back$' 10 >/dev/null
  press both
  press left
  screen_text
}

case ${1:-} in
  start | status | screen | press | press-until | approve | reject | enable-blind-signing | apdu | eth-address | screenshot)
    need curl
    need jq
    ;;
esac

case ${1:-} in
  fetch-apps) fetch_apps ;;
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
    press_until '^(Sign|Accept|Approve)' 30
    press both
    screen_text
    ;;
  reject)
    press_until '^Reject' 30
    press both
    screen_text
    ;;
  enable-blind-signing) enable_blind_signing ;;
  apdu) apdu "${2:-}" ;;
  eth-address) eth_address "${2:-0}" ;;
  screenshot) api GET /screenshot -o "${2:?screenshot takes an output .png path}" && echo "${2}" ;;
  *)
    awk 'NR > 1 && !/^#/ { exit } NR > 1 { sub(/^# ?/, ""); print }' "$0"
    exit 1
    ;;
esac
