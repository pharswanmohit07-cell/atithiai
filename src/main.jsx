import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./AppRouter.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { DestinationProvider } from "./context/DestinationContext.jsx";
import { TravelProvider } from "./context/TravelContext.jsx";
import { ProfileProvider } from "./context/ProfileContext.jsx";
import { initializeReducedEffects } from "./lib/reducedEffects.js";
import ErrorBoundary from "./components/ui/ErrorBoundary.jsx";
import "leaflet/dist/leaflet.css";
import "./index.css";

initializeReducedEffects();

const TEXT_ENTRY_SELECTOR = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';
if (typeof document !== "undefined") {
  const isTextEntry = (target) => target instanceof Element && target.matches(TEXT_ENTRY_SELECTOR);
  document.addEventListener("focusin", (event) => {
    if (isTextEntry(event.target)) document.documentElement.classList.add("keyboard-open");
  });
  document.addEventListener("focusout", () => {
    queueMicrotask(() => {
      if (!isTextEntry(document.activeElement)) document.documentElement.classList.remove("keyboard-open");
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
    <ThemeProvider>
      <DestinationProvider>
        <ProfileProvider>
          <TravelProvider>
            <BrowserRouter><App /></BrowserRouter>
          </TravelProvider>
        </ProfileProvider>
      </DestinationProvider>
    </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
