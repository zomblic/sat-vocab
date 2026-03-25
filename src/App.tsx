import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ContextGamePage from "./pages/ContextGamePage";
import MatchGamePage from "./pages/MatchGamePage";
import SpeedGamePage from "./pages/SpeedGamePage";
import ToneGamePage from "./pages/ToneGamePage";
import WordbankLabPage from "./pages/WordbankLabPage";
import GlossaryPage from "./pages/GlossaryPage";
import ProgressPage from "./pages/ProgressPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />

      <Route path="/play/context" element={<ContextGamePage />} />
      <Route path="/play/match" element={<MatchGamePage />} />
      <Route path="/play/speed" element={<SpeedGamePage />} />
      <Route path="/play/tone" element={<ToneGamePage />} />
      
      <Route path="/glossary" element={<GlossaryPage />} />
      <Route path="/progress" element={<ProgressPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
