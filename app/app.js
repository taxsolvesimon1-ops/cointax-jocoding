const root = document.documentElement;

const elements = {
  langKo: document.querySelector("#lang-ko"),
  langEn: document.querySelector("#lang-en"),
  themeToggle: document.querySelector("#theme-toggle"),
  themeToggleText: document.querySelector("#theme-toggle-text"),
  csvFile: document.querySelector("#csv-file"),
  csvText: document.querySelector("#csv-text"),
  parseBtn: document.querySelector("#parse-btn"),
  uploadStatus: document.querySelector("#upload-status"),
  totalGain: document.querySelector("#total-gain"),
  totalFee: document.querySelector("#total-fee"),
  qualityScore: document.querySelector("#quality-score"),
  flagCount: document.querySelector("#flag-count"),
  recordRows: document.querySelector("#record-rows"),
  chatQuestion: document.querySelector("#chat-question"),
  chatBtn: document.querySelector("#chat-btn"),
  chatAnswer: document.querySelector("#chat-answer"),
  checkoutBtn: document.querySelector("#checkout-btn"),
};

const storedTheme = localStorage.getItem("theme");
const storedLanguage = localStorage.getItem("language");
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
let currentLanguage = storedLanguage === "en" ? "en" : "ko";
let latestSummary = null;

const translations = {
  ko: {
    heroTag: "P0 MVP 워크플로우",
    heroTitle: "CSV 업로드부터 손익 계산, AI 상담까지",
    heroBody: "거래 CSV를 업로드하면 정규화와 FIFO 손익 계산을 실행하고, 결과 기반 질문까지 이어집니다.",
    uploadTitle: "1) CSV 업로드",
    uploadBody: "업비트 형식 포함 CSV를 업로드하거나 직접 붙여넣으세요.",
    parseButton: "파싱 및 계산 실행",
    summaryTitle: "2) 계산 요약",
    gainLabel: "실현 손익",
    feeLabel: "총 수수료",
    qualityLabel: "데이터 품질 점수",
    flagLabel: "엔진 경고",
    recordsTitle: "3) 정규화 거래내역",
    colDate: "일시",
    colType: "유형",
    colAsset: "자산",
    colQty: "수량",
    colAmount: "금액(KRW)",
    chatTitle: "4) AI 상담 (RAG 준비형)",
    chatBody: "근거 문서가 없는 경우 단정하지 않고 추가 질문을 우선합니다.",
    chatPlaceholder: "예: 제 손실도 세금에 반영되나요?",
    chatButton: "질문하기",
    reportTitle: "5) 리포트 결제(Checkout 스켈레톤)",
    reportBody: "Stripe 키 설정 시 Checkout 세션을 생성합니다.",
    checkoutButton: "리포트 결제 진행",
    darkMode: "다크 모드",
    lightMode: "라이트 모드",
    ariaEnableDark: "다크 모드 켜기",
    ariaEnableLight: "라이트 모드 켜기",
    statusReady: "CSV를 입력하고 실행 버튼을 눌러 주세요.",
    statusParsing: "CSV 파싱과 손익 계산을 실행 중입니다...",
    statusDone: "완료: 정규화 및 손익 계산이 반영되었습니다.",
    statusError: "실행 중 오류가 발생했습니다.",
    chatNeedSummary: "먼저 CSV를 업로드해서 계산 결과를 만들어 주세요.",
    chatLoading: "AI 상담 응답을 생성 중입니다...",
    checkoutLoading: "Checkout 세션 생성 중입니다...",
    checkoutFallback: "Stripe 환경변수가 없어 데모 응답을 표시했습니다.",
  },
  en: {
    heroTag: "P0 MVP Workflow",
    heroTitle: "From CSV upload to PnL and AI guidance",
    heroBody: "Upload exchange CSV to run normalization and FIFO gain calculation, then ask follow-up questions.",
    uploadTitle: "1) CSV Upload",
    uploadBody: "Upload an exchange CSV (including Upbit format) or paste raw CSV text.",
    parseButton: "Run Parse & Calculation",
    summaryTitle: "2) Calculation Summary",
    gainLabel: "Realized Gain",
    feeLabel: "Total Fees",
    qualityLabel: "Data Quality Score",
    flagLabel: "Engine Flags",
    recordsTitle: "3) Normalized Transactions",
    colDate: "Datetime",
    colType: "Type",
    colAsset: "Asset",
    colQty: "Quantity",
    colAmount: "Amount (KRW)",
    chatTitle: "4) AI Advisor (RAG-ready)",
    chatBody: "When context is missing, the assistant avoids certainty and asks follow-up questions.",
    chatPlaceholder: "Example: Are my losses reflected in tax estimation?",
    chatButton: "Ask",
    reportTitle: "5) Report Payment (Checkout skeleton)",
    reportBody: "Creates a Stripe Checkout session when Stripe keys are configured.",
    checkoutButton: "Start Report Payment",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    ariaEnableDark: "Enable dark mode",
    ariaEnableLight: "Enable light mode",
    statusReady: "Provide CSV data and run the workflow.",
    statusParsing: "Running CSV parsing and FIFO calculation...",
    statusDone: "Done: normalization and tax calculation are updated.",
    statusError: "An error occurred while running the workflow.",
    chatNeedSummary: "Upload CSV and generate summary first.",
    chatLoading: "Generating AI answer...",
    checkoutLoading: "Creating Checkout session...",
    checkoutFallback: "Stripe variables are missing. Returned demo response.",
  },
};

const moneyFormat = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

function t(key) {
  return translations[currentLanguage]?.[key] ?? translations.ko[key] ?? key;
}

function setTheme(theme) {
  root.setAttribute("data-theme", theme);
  if (elements.themeToggle && elements.themeToggleText) {
    const isDark = theme === "dark";
    elements.themeToggleText.textContent = isDark ? t("lightMode") : t("darkMode");
    elements.themeToggle.setAttribute("aria-label", isDark ? t("ariaEnableLight") : t("ariaEnableDark"));
  }
}

function applyLanguage(language) {
  currentLanguage = language === "en" ? "en" : "ko";
  localStorage.setItem("language", currentLanguage);
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (key) node.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder");
    if (key) node.setAttribute("placeholder", t(key));
  });

  if (elements.langKo && elements.langEn) {
    const korean = currentLanguage === "ko";
    elements.langKo.classList.toggle("is-active", korean);
    elements.langEn.classList.toggle("is-active", !korean);
    elements.langKo.setAttribute("aria-pressed", String(korean));
    elements.langEn.setAttribute("aria-pressed", String(!korean));
  }

  setTheme(root.getAttribute("data-theme") || "light");

  if (!latestSummary) {
    elements.uploadStatus.textContent = t("statusReady");
  }
}

async function readFileText(file) {
  return file.text();
}

function renderRows(records) {
  elements.recordRows.innerHTML = "";
  records.slice(0, 100).forEach((record) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${record.datetime || "-"}</td>
      <td>${record.tx_type || "-"}</td>
      <td>${record.base_asset || "-"}</td>
      <td>${record.quantity ?? "-"}</td>
      <td>${record.amount_krw ?? "-"}</td>
    `;
    elements.recordRows.appendChild(tr);
  });
}

function renderSummary(calcResult, parseResult) {
  latestSummary = {
    total_realized_gain_krw: calcResult.total_realized_gain_krw,
    total_fees_krw: calcResult.total_fees_krw,
    data_quality_score: parseResult.data_quality_score,
    flags: calcResult.flags,
  };

  elements.totalGain.textContent = `${moneyFormat.format(calcResult.total_realized_gain_krw)} KRW`;
  elements.totalFee.textContent = `${moneyFormat.format(calcResult.total_fees_krw)} KRW`;
  elements.qualityScore.textContent = `${parseResult.data_quality_score}/100`;
  elements.flagCount.textContent = String(calcResult.flags.length);
  renderRows(parseResult.records || []);
}

async function runParseAndCalc() {
  try {
    elements.uploadStatus.textContent = t("statusParsing");

    const file = elements.csvFile.files?.[0];
    const csvText = file ? await readFileText(file) : elements.csvText.value;

    if (!csvText || !csvText.trim()) {
      elements.uploadStatus.textContent = t("statusReady");
      return;
    }

    const parseRes = await fetch("/api/upload/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText }),
    });

    if (!parseRes.ok) {
      throw new Error(`Parse API failed: ${parseRes.status}`);
    }

    const parseResult = await parseRes.json();

    const calcRes = await fetch("/api/tax/calc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: parseResult.records }),
    });

    if (!calcRes.ok) {
      throw new Error(`Calc API failed: ${calcRes.status}`);
    }

    const calcResult = await calcRes.json();
    renderSummary(calcResult, parseResult);
    elements.uploadStatus.textContent = t("statusDone");
  } catch (error) {
    console.error(error);
    elements.uploadStatus.textContent = `${t("statusError")} ${error.message}`;
  }
}

async function askAssistant() {
  try {
    if (!latestSummary) {
      elements.chatAnswer.textContent = t("chatNeedSummary");
      return;
    }

    const question = elements.chatQuestion.value.trim();
    if (!question) {
      return;
    }

    elements.chatAnswer.textContent = t("chatLoading");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_question: question,
        user_data_summary: latestSummary,
        context_docs: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat API failed: ${response.status}`);
    }

    const result = await response.json();
    elements.chatAnswer.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    console.error(error);
    elements.chatAnswer.textContent = `${t("statusError")} ${error.message}`;
  }
}

async function startCheckout() {
  try {
    elements.uploadStatus.textContent = t("checkoutLoading");

    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "payment",
        success_url: `${window.location.origin}/app?checkout=success`,
        cancel_url: `${window.location.origin}/app?checkout=cancel`,
      }),
    });

    const result = await response.json();

    if (result.url) {
      window.location.href = result.url;
      return;
    }

    elements.uploadStatus.textContent = `${t("checkoutFallback")} ${result.message || ""}`;
  } catch (error) {
    console.error(error);
    elements.uploadStatus.textContent = `${t("statusError")} ${error.message}`;
  }
}

if (elements.parseBtn) {
  elements.parseBtn.addEventListener("click", runParseAndCalc);
}

if (elements.chatBtn) {
  elements.chatBtn.addEventListener("click", askAssistant);
}

if (elements.checkoutBtn) {
  elements.checkoutBtn.addEventListener("click", startCheckout);
}

if (elements.langKo && elements.langEn) {
  elements.langKo.addEventListener("click", () => applyLanguage("ko"));
  elements.langEn.addEventListener("click", () => applyLanguage("en"));
}

if (elements.themeToggle) {
  elements.themeToggle.addEventListener("click", () => {
    const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  });
}

applyLanguage(currentLanguage);
setTheme(storedTheme || (systemPrefersDark ? "dark" : "light"));
elements.uploadStatus.textContent = t("statusReady");
