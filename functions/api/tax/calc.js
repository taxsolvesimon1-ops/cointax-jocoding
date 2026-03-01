function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getMonthKey(datetime) {
  if (!datetime) return "unknown";
  return String(datetime).slice(0, 7);
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const records = Array.isArray(body.records) ? body.records : [];

    if (!records.length) {
      return json({ error: "records are required" }, 400);
    }

    const sorted = [...records].sort((a, b) => String(a.datetime || "").localeCompare(String(b.datetime || "")));

    const inventoryByAsset = new Map();
    const flags = [];
    const monthly = new Map();
    const byAsset = new Map();

    let totalRealizedGain = 0;
    let totalFees = 0;

    for (const row of sorted) {
      const type = String(row.tx_type || "OTHER").toUpperCase();
      const asset = row.base_asset || "UNKNOWN";
      const qty = toNumber(row.quantity);
      const amountKrw = toNumber(row.amount_krw);
      const fee = toNumber(row.fee_amount);
      const month = getMonthKey(row.datetime);

      if (!monthly.has(month)) {
        monthly.set(month, { month, realized_gain_krw: 0, tx_count: 0 });
      }
      monthly.get(month).tx_count += 1;

      if (!byAsset.has(asset)) {
        byAsset.set(asset, { asset, realized_gain_krw: 0, buy_qty: 0, sell_qty: 0 });
      }

      if (fee > 0) {
        totalFees += fee;
      }

      if (!inventoryByAsset.has(asset)) {
        inventoryByAsset.set(asset, []);
      }

      const lots = inventoryByAsset.get(asset);

      if (type === "BUY") {
        const unitCost = qty > 0 ? amountKrw / qty : 0;
        lots.push({ qty, unitCost });
        byAsset.get(asset).buy_qty += qty;
      }

      if (type === "SELL") {
        let remainingQty = qty;
        let consumedCost = 0;

        while (remainingQty > 0) {
          const lot = lots[0];
          if (!lot) {
            flags.push(`NEGATIVE_INVENTORY_${asset}_AT_ROW_${row.source_row_index}`);
            break;
          }

          const consumeQty = Math.min(remainingQty, lot.qty);
          consumedCost += consumeQty * lot.unitCost;
          lot.qty -= consumeQty;
          remainingQty -= consumeQty;

          if (lot.qty <= 0) {
            lots.shift();
          }
        }

        const realized = amountKrw - consumedCost - fee;
        totalRealizedGain += realized;
        monthly.get(month).realized_gain_krw += realized;
        byAsset.get(asset).realized_gain_krw += realized;
        byAsset.get(asset).sell_qty += qty;
      }

      if (!["BUY", "SELL", "TRANSFER_IN", "TRANSFER_OUT", "FEE", "OTHER", "INCOME", "AIRDROP"].includes(type)) {
        flags.push(`UNKNOWN_TX_TYPE_AT_ROW_${row.source_row_index}`);
      }
    }

    return json({
      method: "FIFO",
      total_realized_gain_krw: Math.round(totalRealizedGain),
      total_fees_krw: Math.round(totalFees),
      flags,
      monthly_summary: Array.from(monthly.values()),
      asset_summary: Array.from(byAsset.values()),
    });
  } catch (error) {
    return json({ error: error.message || "calculation failed" }, 500);
  }
}
