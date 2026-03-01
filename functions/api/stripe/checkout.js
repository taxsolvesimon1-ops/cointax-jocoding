function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const stripeKey = context.env.STRIPE_SECRET_KEY;
    const priceId = context.env.STRIPE_REPORT_PRICE_ID;

    if (!stripeKey || !priceId) {
      return json({
        mode: "demo",
        message: "STRIPE_SECRET_KEY or STRIPE_REPORT_PRICE_ID is not configured.",
      });
    }

    const params = new URLSearchParams();
    params.set("mode", body.mode || "payment");
    params.set("success_url", body.success_url || "https://example.com/success");
    params.set("cancel_url", body.cancel_url || "https://example.com/cancel");
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${stripeKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const result = await response.json();
    if (!response.ok) {
      return json({ error: result.error?.message || "stripe checkout failed" }, 500);
    }

    return json({ id: result.id, url: result.url, mode: "live" });
  } catch (error) {
    return json({ error: error.message || "checkout failed" }, 500);
  }
}
