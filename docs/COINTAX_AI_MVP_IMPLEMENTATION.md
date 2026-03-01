# CoinTax AI MVP Implementation Artifacts

## Scope implemented in this repository
- Landing to app funnel: `/` -> `/app`
- App workflow (P0 skeleton):
  1. CSV upload/paste
  2. Server parse + normalization
  3. Deterministic FIFO gain calculation
  4. Dashboard summary + transaction table
  5. AI advisor endpoint with safe fallback
  6. Stripe Checkout endpoint skeleton

## Cloudflare Pages Functions API

### `POST /api/upload/parse`
Input:
```json
{ "csvText": "..." }
```
Output fields:
- `records[]`: normalized transaction records
- `data_quality_score`
- `warnings[]`
- `header_mappings`

### `POST /api/tax/calc`
Input:
```json
{ "records": [ ... ] }
```
Output fields:
- `method`: `FIFO`
- `total_realized_gain_krw`
- `total_fees_krw`
- `flags[]`
- `monthly_summary[]`
- `asset_summary[]`

### `POST /api/chat`
Input:
```json
{
  "user_question": "...",
  "user_data_summary": {
    "total_realized_gain_krw": 0,
    "total_fees_krw": 0,
    "data_quality_score": 0,
    "flags": []
  },
  "context_docs": []
}
```
Behavior:
- If `OPENAI_API_KEY` exists: calls OpenAI Responses API (`gpt-4o-mini`)
- If missing: returns deterministic fallback answer with disclaimer

### `POST /api/stripe/checkout`
Input:
```json
{ "mode": "payment", "success_url": "...", "cancel_url": "..." }
```
Behavior:
- If `STRIPE_SECRET_KEY` and `STRIPE_REPORT_PRICE_ID` exist: creates checkout session
- If missing: returns demo response

## Prompt templates (ready to use)

### A) CSV mapping helper
```json
{
  "task": "csv_column_mapping",
  "exchange_hint": "upbit|unknown",
  "csv_preview": { "header": ["..."], "rows": [["..."]] },
  "standard_schema": {
    "fields": ["datetime","tx_type","base_asset","quote_asset","quantity","price","amount","fee_amount","fee_asset","tx_id","notes","source_row_index"]
  }
}
```

### B) Ambiguous transaction classification
```json
{
  "task": "tx_classification",
  "taxonomy": ["BUY","SELL","TRANSFER_IN","TRANSFER_OUT","FEE","INCOME","AIRDROP","OTHER"],
  "rows": [{ "source_row_index": 1, "raw_type": "출금", "notes": "to external wallet" }]
}
```

### C) Cost-basis audit assistant
```json
{
  "task": "cost_basis_audit",
  "method": "FIFO",
  "engine_outputs": { "total_realized_gain_krw": 0, "issues_detected_by_engine": [] },
  "sample_lots": [],
  "sample_disposals": []
}
```

### D) RAG tax advisor
```json
{
  "task": "rag_tax_advice",
  "user_question": "...",
  "user_data_summary": { "total_realized_gain_krw": 0, "data_quality_score": 0, "flags": [] },
  "context_docs": [{ "doc_id": "NTS_GUIDE_001", "snippet": "..." }]
}
```

## Environment variables
Use Cloudflare Pages project variables:
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_REPORT_PRICE_ID`

## Guardrail baseline
- Tax/legal certainty is prohibited without evidence docs
- If context docs are missing, the assistant must ask follow-up questions and avoid definitive legal claims
- Deterministic engine owns calculations; LLM provides explanation only

## Suggested next implementation steps
1. Add Firebase Auth and attach `user_id` to records/reports
2. Persist records to D1/R2 with retention policy
3. Add webhook endpoint for Stripe payment confirmation
4. Add real RAG retrieval layer (Vectorize/Pinecone/Weaviate)
5. Add tests for parse mapping and FIFO edge cases
