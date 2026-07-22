import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import VotePage from "./pages/VotePage";
import QuestionnairePage from "./pages/QuestionnairePage";
import ResultsPage from "./pages/ResultsPage";
import WalletConnect from "./components/WalletConnect";

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: "1rem", borderBottom: "1px solid #ccc", display: "flex", gap: "1rem", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link to="/">Home</Link>
          <Link to="/admin">Admin</Link>
          <Link to="/vote">Vote</Link>
          <Link to="/questionnaire">Questionnaire</Link>
          <Link to="/results">Results</Link>
        </div>
        <WalletConnect />
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/vote" element={<VotePage />} />
        <Route path="/questionnaire" element={<QuestionnairePage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
