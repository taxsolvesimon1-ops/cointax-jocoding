const root = document.documentElement;
const themeToggle = document.querySelector("#theme-toggle");
const themeToggleText = document.querySelector("#theme-toggle-text");
const langKoButton = document.querySelector("#lang-ko");
const langEnButton = document.querySelector("#lang-en");
const i18nElements = document.querySelectorAll("[data-i18n]");
const i18nAriaLabelElements = document.querySelectorAll("[data-i18n-aria-label]");
const storedTheme = localStorage.getItem("theme");
const storedLanguage = localStorage.getItem("language");
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const fallbackLanguage = "ko";
let currentLanguage = storedLanguage === "en" ? "en" : fallbackLanguage;

const translations = {
  ko: {
    htmlLang: "ko",
    title: "CoinTax | 암호화폐 세금, 더 명확하게",
    description: "CoinTax는 거래를 정리하고 세금 영향을 계산해, 더 자신 있게 신고할 수 있도록 돕습니다.",
    tagline: "현대적인 암호화폐 투자자가 신뢰하는 서비스",
    heroTitle: "암호화폐 세금, 이제 정말 쉽게 이해하세요.",
    heroSubtext: "CoinTax는 복잡한 지갑 활동을 몇 분 안에 명확하고 감사 대응 가능한 리포트로 변환합니다.",
    heroCta: "무료 체험 시작하기",
    featuresAriaLabel: "CoinTax 기능",
    feature1Title: "자동 가져오기",
    feature1Body: "거래소와 지갑을 연결해 매매, 전송, 스테이킹 활동을 즉시 동기화하세요.",
    feature2Title: "스마트 세금 엔진",
    feature2Body: "정확한 로트 추적과 관할권별 세금 로직으로 자본 이득을 계산합니다.",
    feature3Title: "안심하고 신고",
    feature3Body: "감사 대응을 고려한 깔끔한 세금 서류와 회계사 제출용 요약을 내보내세요.",
    panelTitle: "10분 이내로 현재 세금 포지션을 확인하세요.",
    panelCta: "CoinTax 계정 만들기",
    darkMode: "다크 모드",
    lightMode: "라이트 모드",
    ariaEnableDark: "다크 모드 켜기",
    ariaEnableLight: "라이트 모드 켜기",
  },
  en: {
    htmlLang: "en",
    title: "CoinTax | Crypto Tax Made Clear",
    description: "CoinTax helps you organize transactions, calculate tax impact, and file with confidence.",
    tagline: "Trusted by modern crypto investors",
    heroTitle: "Crypto taxes, finally easy to understand.",
    heroSubtext: "CoinTax turns complex wallet activity into clear, audit-ready reports in minutes.",
    heroCta: "Start Free Trial",
    featuresAriaLabel: "CoinTax features",
    feature1Title: "Automatic Import",
    feature1Body: "Connect exchanges and wallets to sync trades, transfers, and staking activity instantly.",
    feature2Title: "Smart Tax Engine",
    feature2Body: "Calculate capital gains with accurate lot tracking and jurisdiction-aware tax logic.",
    feature3Title: "File with Confidence",
    feature3Body: "Export clean tax forms and accountant-ready summaries built for audit peace of mind.",
    panelTitle: "See your tax position in under 10 minutes.",
    panelCta: "Create Your CoinTax Account",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    ariaEnableDark: "Enable dark mode",
    ariaEnableLight: "Enable light mode",
  },
};

const applyLanguage = (language) => {
  const dictionary = translations[language] || translations[fallbackLanguage];

  document.documentElement.setAttribute("lang", dictionary.htmlLang);

  if (document.title) {
    document.title = dictionary.title;
  }

  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    descriptionMeta.setAttribute("content", dictionary.description);
  }

  i18nElements.forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (key && dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });

  i18nAriaLabelElements.forEach((element) => {
    const key = element.getAttribute("data-i18n-aria-label");
    if (key && dictionary[key]) {
      element.setAttribute("aria-label", dictionary[key]);
    }
  });

  if (langKoButton && langEnButton) {
    const isKorean = language === "ko";
    langKoButton.classList.toggle("is-active", isKorean);
    langEnButton.classList.toggle("is-active", !isKorean);
    langKoButton.setAttribute("aria-pressed", String(isKorean));
    langEnButton.setAttribute("aria-pressed", String(!isKorean));
  }
};

const setTheme = (theme) => {
  root.setAttribute("data-theme", theme);
  if (themeToggle && themeToggleText) {
    const isDark = theme === "dark";
    const dictionary = translations[currentLanguage] || translations[fallbackLanguage];
    themeToggleText.textContent = isDark ? dictionary.lightMode : dictionary.darkMode;
    themeToggle.setAttribute(
      "aria-label",
      isDark ? dictionary.ariaEnableLight : dictionary.ariaEnableDark
    );
  }
};

applyLanguage(currentLanguage);
setTheme(storedTheme || (systemPrefersDark ? "dark" : "light"));

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  });
}

if (langKoButton && langEnButton) {
  langKoButton.addEventListener("click", () => {
    currentLanguage = "ko";
    localStorage.setItem("language", currentLanguage);
    applyLanguage(currentLanguage);
    setTheme(root.getAttribute("data-theme") || "light");
  });

  langEnButton.addEventListener("click", () => {
    currentLanguage = "en";
    localStorage.setItem("language", currentLanguage);
    applyLanguage(currentLanguage);
    setTheme(root.getAttribute("data-theme") || "light");
  });
}

const revealElements = document.querySelectorAll(".reveal-up");

if (revealElements.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${index * 90}ms`;
    observer.observe(element);
  });
}
