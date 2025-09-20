import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AppState {
  authInfos: AuthInfos | null;
  token: string | null;
  isInit: boolean;
  diffEnabled: boolean;
  login: (authInfos: AuthInfos) => void;
  logout: () => void;
  setToken: (token: string | null) => void;
  init: () => void;
  disableDiff: () => void;
  enableDiff: () => void;
}

export interface AuthInfos {
  user: User;
  isAuthenticated: boolean;
  token: string | null;
}

const useAuthStore = create<AppState>((set, get) => ({
  authInfos: null,
  token: null,
  isInit: false,
  diffEnabled: false,
  init: () => {
    const currentState = get();
    const localStorageAuthInfos = localStorage.getItem("authInfos");
    if (localStorageAuthInfos) {
      try {
        const authInfos = JSON.parse(localStorageAuthInfos);
        if (authInfos && !currentState.isInit) {
          authInfos.isAuthenticated = true;
          set({ authInfos: authInfos, token: authInfos.token, isInit: true });
        }
      } catch (e) {}
    }
  },
  login: (authInfos: AuthInfos) => {
    // Save the user information to local storage
    authInfos.isAuthenticated = true;
    localStorage.setItem("authInfos", JSON.stringify(authInfos));
    set({ authInfos, token: authInfos.token });
  },
  logout: () => {
    // Remove the user information from local storage
    localStorage.removeItem("authInfos");
    set({ authInfos: null, token: null, isInit: false });
  },
  setToken(token: string | null) {
    const { authInfos } = get();
    if (authInfos) {
      authInfos.token = token;
      localStorage.setItem("authInfos", JSON.stringify(authInfos));
    }
    set({ token });
  },

  disableDiff: () => {
    set({ diffEnabled: false });
  },

  enableDiff: () => {
    set({ diffEnabled: true });
  },
}));

export default useAuthStore;
