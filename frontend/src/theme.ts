import { useEffect, useState } from "react";

// Validated, colorblind-safe categorical palette (dataviz method). Both modes are
// SELECTED — the dark column is the same eight hues stepped for the dark surface,
// not an automatic flip. Assign in fixed slot order, never cycled for meaning.
export const SERIES_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
export const SERIES_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

export interface Chrome {
  grid: string;
  axis: string;
  tick: string;
  text: string;
  tooltipBg: string;
  tooltipBorder: string;
  surface: string;
}

const LIGHT: Chrome = {
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  tick: "#898781",
  text: "#52514e",
  tooltipBg: "#fcfcfb",
  tooltipBorder: "rgba(11,11,11,0.10)",
  surface: "#fcfcfb",
};
const DARK: Chrome = {
  grid: "#2c2c2a",
  axis: "#383835",
  tick: "#898781",
  text: "#c3c2b7",
  tooltipBg: "#1a1a19",
  tooltipBorder: "rgba(255,255,255,0.10)",
  surface: "#1a1a19",
};

const KEY = "aditum_app_theme";

function systemDark(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

// Called once before render — stamps data-theme from the saved choice or the OS
// setting, so the toggle wins both ways.
export function initTheme(): void {
  const saved = localStorage.getItem(KEY);
  const dark = saved ? saved === "dark" : systemDark();
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

export function toggleTheme(): void {
  const dark = document.documentElement.getAttribute("data-theme") !== "dark";
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  localStorage.setItem(KEY, dark ? "dark" : "light");
  window.dispatchEvent(new Event("themechange"));
}

export function useTheme(): { dark: boolean; series: string[]; chrome: Chrome } {
  const read = () => document.documentElement.getAttribute("data-theme") === "dark";
  const [dark, setDark] = useState(read);
  useEffect(() => {
    const onChange = () => setDark(read());
    window.addEventListener("themechange", onChange);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("themechange", onChange);
      mq.removeEventListener("change", onChange);
    };
  }, []);
  return { dark, series: dark ? SERIES_DARK : SERIES_LIGHT, chrome: dark ? DARK : LIGHT };
}
