import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import VotePage from "./pages/VotePage";
import QuestionnairePage from "./pages/QuestionnairePage";
import ResultsPage from "./pages/ResultsPage";
import WalletConnect from "./components/WalletConnect";

export default function App() {
  return (
    <BrowserRouter>
      <nav className="navbar">
        <div className="navbar-left">
          <NavLink to="/" className="navbar-brand">
            🗳️ <span>Block</span>Vote
          </NavLink>
          <div className="navbar-links">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/admin">Admin</NavLink>
            <NavLink to="/vote">Vote</NavLink>
            <NavLink to="/questionnaire">Questionnaire</NavLink>
            <NavLink to="/results">Results</NavLink>
          </div>
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
