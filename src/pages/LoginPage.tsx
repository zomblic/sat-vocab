import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../ui/Shell";
import { loadUser, saveUser, type UserProfile } from "../lib/userStore";
import { sfxClick } from "../lib/sfx";

export default function LoginPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [classCode, setClassCode] = useState("");

  useEffect(() => {
    const existing = loadUser();
    if (existing) nav("/home", { replace: true });
  }, [nav]);

  const onStart = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    sfxClick();

    const profile: UserProfile = {
      name: trimmed,
      classCode: classCode.trim() || undefined,
    };

    saveUser(profile);
    nav("/home");
  };

  return (
    <Shell>
      <h1 className="title">SAT Vocab Quest</h1>
      <p className="subtitle">Choose a name to begin.</p>

      <label className="label">
        Name
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Jordan" autoFocus />
      </label>

      <label className="label">
        Class code (optional)
        <input className="input" value={classCode} onChange={(e) => setClassCode(e.target.value)} placeholder="e.g., TUES-4PM" />
      </label>

      <button className="button" onClick={onStart} disabled={!name.trim()}>
        Start
      </button>

      <p className="tiny">Saved on this device only (localStorage).</p>
    </Shell>
  );
}
