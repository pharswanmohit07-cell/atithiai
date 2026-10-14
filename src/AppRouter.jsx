import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AtithiAI from "./App.jsx";
import { PrivacyPolicy, TermsAndConditions } from "./pages/LegalPages.jsx";

export default function AppRouter() {
  return <Routes>
    <Route path="/" element={<AtithiAI/>}/>
    <Route path="/privacy" element={<PrivacyPolicy/>}/>
    <Route path="/terms" element={<TermsAndConditions/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}
