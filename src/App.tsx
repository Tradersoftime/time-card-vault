import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages that already exist in your project (left sidebar > src/pages)
import Home from "./pages/Home";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import CardRedirect from "./pages/CardRedirect";   // (/r/:code)
import ClaimCard from "./pages/ClaimCard";         // (/claim?code=...)
import MyCards from "./pages/MyCards";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Auth */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* QR entry and claim */}
        <Route path="/r/:code" element={<CardRedirect />} />
        <Route path="/claim" element={<ClaimCard />} />

        {/* User collection */}
        <Route path="/me/cards" element={<MyCards />} />

        {/* Admin placeholder */}
        <Route path="/admin" element={<Admin />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
