"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

const storageKey = "ruet-thesis-topics-expanded";

export default function useThesisTopicsState(): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(storageKey) === "true") setOpen(true);
  }, []);

  const updateOpen = useCallback<Dispatch<SetStateAction<boolean>>>((value) => {
    setOpen((current) => {
      const next = typeof value === "function" ? value(current) : value;
      sessionStorage.setItem(storageKey, String(next));
      return next;
    });
  }, []);

  return [open, updateOpen];
}
