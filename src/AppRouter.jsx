import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AtithiAI from "./App.jsx";

export default function AppRouter() {
  return <Routes>
    <Route path="/" element={<AtithiAI/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}
