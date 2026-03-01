const root = document.documentElement;
const themeToggle = document.querySelector("#theme-toggle");
const themeToggleText = document.querySelector("#theme-toggle-text");
const storedTheme = localStorage.getItem("theme");
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

const setTheme = (theme) => {
  root.setAttribute("data-theme", theme);
  if (themeToggle && themeToggleText) {
    const isDark = theme === "dark";
    themeToggleText.textContent = isDark ? "Light Mode" : "Dark Mode";
    themeToggle.setAttribute(
      "aria-label",
      isDark ? "Enable light mode" : "Enable dark mode"
    );
  }
};

setTheme(storedTheme || (systemPrefersDark ? "dark" : "light"));

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
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
