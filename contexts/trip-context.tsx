"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Subtrip } from "@/lib/types/database";

interface TripContextType {
  subtrips: Subtrip[];
  setSubtrips: (subtrips: Subtrip[]) => void;
  addSubtrip: (subtrip: Subtrip) => void;
  updateSubtrip: (subtripId: string, updates: Partial<Subtrip>) => void;
  removeSubtrip: (subtripId: string) => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ 
  children, 
  initialSubtrips = [] 
}: { 
  children: ReactNode;
  initialSubtrips?: Subtrip[];
}) {
  const [subtrips, setSubtrips] = useState<Subtrip[]>(initialSubtrips);

  const addSubtrip = (subtrip: Subtrip) => {
    setSubtrips(prev => [...prev, subtrip]);
  };

  const updateSubtrip = (subtripId: string, updates: Partial<Subtrip>) => {
    setSubtrips(prev => 
      prev.map(subtrip => 
        subtrip.id === subtripId 
          ? { ...subtrip, ...updates }
          : subtrip
      )
    );
  };

  const removeSubtrip = (subtripId: string) => {
    setSubtrips(prev => prev.filter(subtrip => subtrip.id !== subtripId));
  };

  return (
    <TripContext.Provider value={{
      subtrips,
      setSubtrips,
      addSubtrip,
      updateSubtrip,
      removeSubtrip,
    }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTripContext() {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error("useTripContext must be used within a TripProvider");
  }
  return context;
}