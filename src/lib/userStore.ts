export type UserProfile = {
  name: string;
  classCode?: string;
};

const LS_USER_KEY = "satVocab:user";

export function loadUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: UserProfile) {
  localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(LS_USER_KEY);
}
