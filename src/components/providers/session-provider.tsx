"use client";

import { createContext, useContext, useMemo } from "react";
import type { User } from "@supabase/supabase-js";

type SessionContextValue = {
  user: User | null;
};

const SessionContext = createContext<SessionContextValue>({
  user: null,
});

type SessionProviderProps = {
  children: React.ReactNode;
  initialUser: User | null;
};

export function SessionProvider({
  children,
  initialUser,
}: SessionProviderProps) {
  const value = useMemo(
    () => ({
      user: initialUser,
    }),
    [initialUser]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
