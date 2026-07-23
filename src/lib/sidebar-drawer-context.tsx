"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type SidebarDrawerValue = {
  abierto: boolean;
  setAbierto: (abierto: boolean) => void;
};

const SidebarDrawerContext = createContext<SidebarDrawerValue | null>(null);

export function SidebarDrawerProvider({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <SidebarDrawerContext.Provider value={{ abierto, setAbierto }}>
      {children}
    </SidebarDrawerContext.Provider>
  );
}

export function useSidebarDrawer() {
  const ctx = useContext(SidebarDrawerContext);
  if (!ctx) throw new Error("useSidebarDrawer debe usarse dentro de SidebarDrawerProvider");
  return ctx;
}
