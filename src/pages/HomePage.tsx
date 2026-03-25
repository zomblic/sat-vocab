import { Navigate, useNavigate } from "react-router-dom";
import Shell from "../ui/Shell";
import { clearUser, loadUser } from "../lib/userStore";
import { sfxClick } from "../lib/sfx";

export default function HomePage() {
  const nav = useNavigate();
  const user = loadUser();
  if (!user) return <Navigate to="/" replace />;

  return (
    <Shell>
      <h1 className="title">Menu</h1>
      <p className="subtitle">Welcome, {user.name}. Choose a mode.</p>

      <div className="row">
        <button className="button" onClick={() => { sfxClick(); nav("/play/context"); }}>
          Words in Context
        </button>

        <button className="button ghost" onClick={() => { sfxClick(); nav("/play/match"); }}>
          Matching
        </button>

        <button className="button ghost" onClick={() => { sfxClick(); nav("/play/speed"); }}>
          Speed Round
        </button>

        <button className="button ghost" onClick={() => { sfxClick(); nav("/play/tone"); }}>
          Tone Quest
        </button>

     
        <button className="button ghost" onClick={() => { sfxClick(); nav("/glossary"); }}>
          Glossary
        </button>

        <button className="button ghost" onClick={() => { sfxClick(); nav("/progress"); }}>
          Progress
        </button>
      </div>

      <button
        className="link"
        onClick={() => {
          sfxClick();
          clearUser();
          nav("/", { replace: true });
        }}
      >
        Switch user
      </button>
    </Shell>
  );
}
