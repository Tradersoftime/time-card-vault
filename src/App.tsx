import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import CardRedirect from "./pages/CardRedirect";   // /r/:code
import ClaimCard from "./pages/ClaimCard";         // /claim?code=...

function Home() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">TOT Cards</h1>
      <p>Scan a card QR or sign in to claim.</p>
      <div className="space-x-3">
        <Link to="/auth/login" className="underline">Sign in</Link>
      </div>
    </div>
  );
}

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

        {/* NOTE: We intentionally removed MyCards/Admin/NotFound for now
           to avoid “module not found” errors until we create them. */}
      </Routes>
    </BrowserRouter>
  );
}
