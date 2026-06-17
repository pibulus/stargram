#!/usr/bin/env bash
# Mystical Horoscope Oracle for Stargram/Pablo.

set -euo pipefail

SIGN="libra"
DAY_PARAM=""
JSON_MODE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)
      JSON_MODE=1
      ;;
    --day)
      DAY_PARAM="${2:-}"
      shift
      ;;
    *)
      SIGN="$1"
      ;;
  esac
  shift
done

SIGN="$(echo "$SIGN" | tr '[:upper:]' '[:lower:]')"

get_zodiac_emoji() {
  case "$1" in
    aries) echo "♈" ;;
    taurus) echo "♉" ;;
    gemini) echo "♊" ;;
    cancer) echo "♋" ;;
    leo) echo "♌" ;;
    virgo) echo "♍" ;;
    libra) echo "♎" ;;
    scorpio) echo "♏" ;;
    sagittarius) echo "♐" ;;
    capricorn) echo "♑" ;;
    aquarius) echo "♒" ;;
    pisces) echo "♓" ;;
    *) echo "✨" ;;
  esac
}

get_tip() {
  local tips=(
    "🌙 Trust your intuition today"
    "✨ The universe has your back"
    "🌟 Magic is in the air"
    "💫 Embrace the chaos"
    "🔮 Signs are everywhere"
  )
  echo "${tips[$RANDOM % ${#tips[@]}]}"
}

if [[ -z "$DAY_PARAM" ]]; then
  HOUR="$(TZ=Australia/Melbourne date +%H)"
  DAY_PARAM="today"
  if [[ "$HOUR" -ge 0 && "$HOUR" -lt 18 ]]; then
    DAY_PARAM="tomorrow"
  fi
fi

DATE="$(TZ=Australia/Melbourne date +"%Y-%m-%d")"
EMOJI="$(get_zodiac_emoji "$SIGN")"
TIP="$(get_tip)"
SIGN_TITLE="$(tr '[:lower:]' '[:upper:]' <<<"${SIGN:0:1}")${SIGN:1}"

# Try Ohmanda first for daily
RESPONSE=""
if [[ "$DAY_PARAM" == "today" || "$DAY_PARAM" == "tomorrow" ]]; then
  RESPONSE="$(
    curl -sL --connect-timeout 5 --max-time 10 \
      "https://ohmanda.com/api/horoscope/${SIGN}/" \
      2>/dev/null
  )"
fi

HOROSCOPE="$(
  echo "$RESPONSE" | jq -r '.horoscope // empty' 2>/dev/null
)"

# Fallback to freehoroscopeapi if Ohmanda failed or was empty
if [[ -z "$HOROSCOPE" || "$HOROSCOPE" == "null" ]]; then
  RESPONSE="$(
    curl -sL --connect-timeout 5 --max-time 10 \
      "https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${SIGN}&day=${DAY_PARAM}" \
      2>/dev/null
  )"
  HOROSCOPE="$(
    echo "$RESPONSE" | jq -r '(.data.horoscope_data // .data.horoscope) // empty' 2>/dev/null
  )"
fi

if [[ "$JSON_MODE" -eq 1 ]]; then
  if [[ -z "$HOROSCOPE" || "$HOROSCOPE" == "null" ]]; then
    jq -n \
      --arg error "The stars are cloudy today" \
      '{success:false,error:$error}'
    exit 1
  fi

  jq -n \
    --arg date "$DATE" \
    --arg sign "$SIGN_TITLE" \
    --arg horoscope "$HOROSCOPE" \
    --arg tip "$TIP" \
    '{
      success: true,
      data: {
        date: $date,
        period: "daily",
        sign: $sign,
        horoscope: $horoscope,
        horoscope_data: $horoscope,
        source: "pablo-oracle",
        tip: $tip
      }
    }'
  exit 0
fi

PURPLE='\033[95m'
CYAN='\033[96m'
YELLOW='\033[93m'
RESET='\033[0m'
BOLD='\033[1m'

echo -e "${CYAN}🔮 Consulting the cosmic oracle...${RESET}"

if [[ -n "$HOROSCOPE" && "$HOROSCOPE" != "null" ]]; then
  echo ""
  echo -e "${PURPLE}╔══════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${PURPLE}║${RESET}  ${BOLD}${EMOJI}  $(echo "$SIGN" | tr '[:lower:]' '[:upper:]') HOROSCOPE${RESET}  ${PURPLE}║${RESET}"
  echo -e "${PURPLE}║${RESET}  ${YELLOW}${DATE}${RESET}                                           ${PURPLE}║${RESET}"
  echo -e "${PURPLE}╠══════════════════════════════════════════════════════════╣${RESET}"

  echo "$HOROSCOPE" | fold -s -w 56 | while IFS= read -r line; do
    printf "${PURPLE}║${RESET}  %-56s  ${PURPLE}║${RESET}\n" "$line"
  done

  echo -e "${PURPLE}╚══════════════════════════════════════════════════════════╝${RESET}"
  echo ""
  echo -e "${CYAN}${TIP}${RESET}"
else
  echo -e "${PURPLE}╔══════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${PURPLE}║${RESET}  ❌ The stars are cloudy today...                       ${PURPLE}║${RESET}"
  echo -e "${PURPLE}║${RESET}  Try again when the cosmic wifi improves!               ${PURPLE}║${RESET}"
  echo -e "${PURPLE}╚══════════════════════════════════════════════════════════╝${RESET}"
  exit 1
fi
