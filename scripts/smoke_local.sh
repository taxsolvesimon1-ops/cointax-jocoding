#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8788}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="/tmp/cointax_pages_dev.log"

cd "$ROOT_DIR"

npx --yes wrangler pages dev . --port "$PORT" >"$LOG_FILE" 2>&1 &
PID=$!
cleanup(){
  kill "$PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

READY=0
for _ in $(seq 1 60); do
  if curl -sS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.5
done

if [ "$READY" -ne 1 ]; then
  echo "[FAIL] Local server did not start"
  tail -n 120 "$LOG_FILE" || true
  exit 1
fi

echo "[OK] root page"
curl -sS "http://127.0.0.1:${PORT}/" | rg -q "CoinTax"

echo "[OK] app page"
curl -sS "http://127.0.0.1:${PORT}/app/" | rg -q "CSV 업로드"

CSV_PAYLOAD='{"csvText":"체결시간,마켓,구분,체결가격,체결량,체결금액,수수료,수수료통화\n2026-01-01 09:00:00,KRW-BTC,매수,65000000,0.01,650000,500,KRW\n2026-01-03 10:00:00,KRW-BTC,매도,70000000,0.005,350000,300,KRW"}'

PARSE_JSON="$(curl -sS -X POST "http://127.0.0.1:${PORT}/api/upload/parse" -H 'content-type: application/json' --data "$CSV_PAYLOAD")"
echo "[OK] parse api"
echo "$PARSE_JSON" | jq -e '.records | length == 2' >/dev/null

CALC_REQ="$(echo "$PARSE_JSON" | jq -c '{records: .records}')"
CALC_JSON="$(curl -sS -X POST "http://127.0.0.1:${PORT}/api/tax/calc" -H 'content-type: application/json' --data "$CALC_REQ")"
echo "[OK] calc api"
echo "$CALC_JSON" | jq -e '.method == "FIFO"' >/dev/null

CHAT_JSON="$(curl -sS -X POST "http://127.0.0.1:${PORT}/api/chat" -H 'content-type: application/json' --data '{"user_question":"손실도 반영되나요?","user_data_summary":{"total_realized_gain_krw":24700,"total_fees_krw":800,"data_quality_score":100,"flags":[]},"context_docs":[]}')"
echo "[OK] chat api"
echo "$CHAT_JSON" | jq -e '.one_line_conclusion != null' >/dev/null

CHECKOUT_JSON="$(curl -sS -X POST "http://127.0.0.1:${PORT}/api/stripe/checkout" -H 'content-type: application/json' --data '{"mode":"payment","success_url":"https://example.com/s","cancel_url":"https://example.com/c"}')"
echo "[OK] stripe checkout api"
echo "$CHECKOUT_JSON" | jq -e '(.mode == "demo") or (.url != null)' >/dev/null

echo
echo "SMOKE PASS"
echo "$PARSE_JSON" | jq '{data_quality_score, records_count:(.records|length)}'
echo "$CALC_JSON" | jq '{method, total_realized_gain_krw, total_fees_krw, flags_count:(.flags|length)}'
echo "$CHAT_JSON" | jq '{one_line_conclusion, confidence}'
echo "$CHECKOUT_JSON" | jq '{mode, has_url:(.url!=null)}'
