import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { TempUnit } from '../engine/scoring';
import { getTempUnit, setTempUnit as persistTempUnit } from '../utils/storage';

interface TempUnitContextType {
  unit: TempUnit;
  setUnit: (unit: TempUnit) => Promise<void>;
}

const TempUnitContext = createContext<TempUnitContextType>({
  unit: 'C',
  setUnit: async () => {},
});

/** Celsius by default; the °F toggle lives in Settings and applies to every mode. */
export const useTempUnit = () => useContext(TempUnitContext);

export function TempUnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<TempUnit>('C');

  useEffect(() => {
    getTempUnit().then(setUnitState);
  }, []);

  const setUnit = useCallback(async (next: TempUnit) => {
    setUnitState(next);
    await persistTempUnit(next);
  }, []);

  const value = useMemo(() => ({ unit, setUnit }), [unit, setUnit]);
  return <TempUnitContext.Provider value={value}>{children}</TempUnitContext.Provider>;
}
