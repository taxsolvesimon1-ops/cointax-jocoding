function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function buildFallbackAdvice(question, summary, contextDocs) {
  const gain = Number(summary?.total_realized_gain_krw || 0);
  const quality = Number(summary?.data_quality_score || 0);
  const flags = Array.isArray(summary?.flags) ? summary.flags : [];
  const hasContext = Array.isArray(contextDocs) && contextDocs.length > 0;

  const conclusion = gain > 0
    ? "현재 데이터 기준으로는 과세 대상 이익이 발생했을 가능성이 있습니다."
    : "현재 데이터 기준으로는 과세 이익이 크지 않거나 손실 구간일 가능성이 있습니다.";

  const next = quality < 85 || flags.length
    ? "입출금 누락 가능성이 있어 추가 CSV 업로드 후 다시 계산하는 것을 권장합니다."
    : "현재 데이터 품질이 양호하므로 리포트를 생성해 검토할 수 있습니다.";

  return {
    one_line_conclusion: conclusion,
    answer_markdown: [
      `질문: ${question}`,
      `- 실현손익(원): ${gain}`,
      `- 데이터 품질 점수: ${quality}`,
      `- 엔진 경고: ${flags.length ? flags.join(", ") : "없음"}`,
      `- 안내: ${next}`,
      hasContext
        ? "- 참고: 제공된 근거 문서를 기준으로 설명했습니다."
        : "- 참고: 현재 근거 문서가 없어 법령/세율 단정은 피하고 추가 확인이 필요합니다.",
      "면책: 본 답변은 일반 정보 제공용이며 세무 자문이 아닙니다.",
    ].join("\n"),
    citations: hasContext
      ? contextDocs.slice(0, 3).map((doc) => ({ doc_id: doc.doc_id, used_for: "general guidance" }))
      : [],
    follow_up_questions: quality < 85
      ? ["입출금 CSV도 함께 업로드할 수 있나요?", "과세연도 설정이 정확한가요?"]
      : ["리포트(PDF)를 생성해 확인할까요?"],
    confidence: hasContext ? 0.74 : 0.42,
    safety_notes: [
      "법령/세율은 변경될 수 있으므로 최신 공지 확인이 필요합니다.",
      "근거 문서가 없으면 단정 대신 추가 확인 질문을 우선합니다.",
    ],
  };
}

async function callOpenAI(apiKey, payload) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API failed: ${response.status} ${text}`);
  }

  return response.json();
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const question = String(body.user_question || "").trim();
    const summary = body.user_data_summary || {};
    const contextDocs = Array.isArray(body.context_docs) ? body.context_docs : [];

    if (!question) {
      return json({ error: "user_question is required" }, 400);
    }

    const apiKey = context.env.OPENAI_API_KEY;

    if (!apiKey) {
      return json(buildFallbackAdvice(question, summary, contextDocs));
    }

    const prompt = {
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are CoinTax AI assistant. Do not provide legal certainty without evidence. Return JSON only with keys: one_line_conclusion, answer_markdown, citations, follow_up_questions, confidence, safety_notes.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({ question, summary, context_docs: contextDocs }),
            },
          ],
        },
      ],
      temperature: 0.3,
    };

    const openaiResponse = await callOpenAI(apiKey, prompt);
    const text = openaiResponse.output_text;

    try {
      const parsed = JSON.parse(text);
      return json(parsed);
    } catch {
      return json(buildFallbackAdvice(question, summary, contextDocs));
    }
  } catch (error) {
    return json({ error: error.message || "chat failed" }, 500);
  }
}
