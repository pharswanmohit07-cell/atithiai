import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./AppRouter.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AppProvider } from "./context/AppContext.jsx";
import "leaflet/dist/leaflet.css";
import "./index.css";
ReactDOM.createRoot(document.getElementById("root")).render(
 <React.StrictMode><ThemeProvider><AuthProvider><AppProvider><BrowserRouter><App/></BrowserRouter></AppProvider></AuthProvider></ThemeProvider></React.StrictMode>
);
