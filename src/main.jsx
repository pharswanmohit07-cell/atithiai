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
