function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function detectDelimiter(headerLine) {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;

  candidates.forEach((delimiter) => {
    const count = headerLine.split(delimiter).length;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  });

  return best;
}

function parseCsvLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).replace(/,/g, "").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function normalizeTxType(rawType) {
  const raw = String(rawType || "").toLowerCase();

  if (["매수", "buy"].some((x) => raw.includes(x))) return "BUY";
  if (["매도", "sell"].some((x) => raw.includes(x))) return "SELL";
  if (["출금", "withdraw", "transfer_out"].some((x) => raw.includes(x))) return "TRANSFER_OUT";
  if (["입금", "deposit", "transfer_in"].some((x) => raw.includes(x))) return "TRANSFER_IN";
  if (["수수료", "fee"].some((x) => raw.includes(x))) return "FEE";
  return "OTHER";
}

function toDatetime(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  return text.replace(/\./g, "-");
}

function mapHeaders(headers) {
  const lower = headers.map((h) => h.toLowerCase());

  const find = (aliases) => {
    const idx = lower.findIndex((h) => aliases.some((a) => h.includes(a)));
    return idx >= 0 ? headers[idx] : null;
  };

  return {
    datetime: find(["체결시간", "timestamp", "date", "datetime", "time"]),
    market: find(["마켓", "pair", "market", "symbol"]),
    tx_type: find(["구분", "side", "type"]),
    price: find(["체결가격", "price"]),
    quantity: find(["체결량", "amount", "quantity", "qty", "executed amount"]),
    amount: find(["체결금액", "notional", "total", "amount_krw", "value"]),
    fee_amount: find(["수수료", "fee"]),
    fee_asset: find(["수수료통화", "fee coin", "fee_asset"]),
    tx_id: find(["order id", "txid", "거래id", "주문번호"]),
    notes: find(["note", "memo", "비고"]),
  };
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((header, idx) => {
    obj[header] = row[idx] ?? "";
  });
  return obj;
}

function splitMarket(market) {
  const text = String(market || "").trim();
  if (!text) return { base: null, quote: null };

  if (text.includes("-")) {
    const [quote, base] = text.split("-");
    return { base, quote };
  }

  if (text.includes("/")) {
    const [base, quote] = text.split("/");
    return { base, quote };
  }

  return { base: text, quote: null };
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const csvText = String(body.csvText || "");

    if (!csvText.trim()) {
      return json({ error: "csvText is required" }, 400);
    }

    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return json({ error: "at least one header and one data row are required" }, 400);
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = parseCsvLine(lines[0], delimiter);
    const headerMap = mapHeaders(headers);
    const warnings = [];

    if (!headerMap.datetime) warnings.push("datetime header not detected");
    if (!headerMap.tx_type) warnings.push("tx_type header not detected");
    if (!headerMap.quantity) warnings.push("quantity header not detected");

    const records = [];
    let missingCritical = 0;

    for (let i = 1; i < lines.length; i += 1) {
      const columns = parseCsvLine(lines[i], delimiter);
      const rowObj = rowToObject(headers, columns);
      const marketInfo = splitMarket(headerMap.market ? rowObj[headerMap.market] : "");
      const quantity = parseNumber(headerMap.quantity ? rowObj[headerMap.quantity] : null);
      const amount = parseNumber(headerMap.amount ? rowObj[headerMap.amount] : null);
      const price = parseNumber(headerMap.price ? rowObj[headerMap.price] : null);
      const feeAmount = parseNumber(headerMap.fee_amount ? rowObj[headerMap.fee_amount] : null);

      let amountKrw = amount;
      if (amountKrw === null && quantity !== null && price !== null) {
        amountKrw = quantity * price;
      }

      const txType = normalizeTxType(headerMap.tx_type ? rowObj[headerMap.tx_type] : "");

      const record = {
        source_row_index: i + 1,
        datetime: toDatetime(headerMap.datetime ? rowObj[headerMap.datetime] : null),
        tx_type: txType,
        base_asset: marketInfo.base || null,
        quote_asset: marketInfo.quote || "KRW",
        quantity,
        price,
        amount_krw: amountKrw,
        fee_amount: feeAmount,
        fee_asset: headerMap.fee_asset ? rowObj[headerMap.fee_asset] || "KRW" : "KRW",
        tx_id: headerMap.tx_id ? rowObj[headerMap.tx_id] || null : null,
        notes: headerMap.notes ? rowObj[headerMap.notes] || null : null,
      };

      if (!record.datetime || !record.tx_type || record.quantity === null) {
        missingCritical += 1;
      }

      records.push(record);
    }

    const dataQualityScore = Math.max(0, 100 - Math.round((missingCritical / records.length) * 100));

    return json({
      detected_exchange: "unknown",
      delimiter,
      header_mappings: headerMap,
      warnings,
      requires_user_confirmation: warnings.length > 0,
      data_quality_score: dataQualityScore,
      records,
    });
  } catch (error) {
    return json({ error: error.message || "parse failed" }, 500);
  }
}
