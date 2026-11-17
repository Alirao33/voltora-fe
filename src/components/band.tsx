'use client';
import { createContext, useContext, type ReactNode } from 'react';

/** What a page puts into the lime header band that the app shell draws at the top. */
export type BandContent = { title: ReactNode; desc?: ReactNode; actions?: ReactNode };
export const BandContext = createContext<{ set: (c: BandContent | null) => void } | null>(null);
export const useBand = () => useContext(BandContext);
