import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./AppRouter.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { DestinationProvider } from "./context/DestinationContext.jsx";
import { HotelProvider } from "./context/HotelContext.jsx";
import "leaflet/dist/leaflet.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <DestinationProvider>
          <HotelProvider>
            <BrowserRouter><App /></BrowserRouter>
          </HotelProvider>
        </DestinationProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
