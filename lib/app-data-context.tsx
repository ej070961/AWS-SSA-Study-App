"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Question } from "@/types";

type AnsweredEntry = { questionNum: number; status: string };

type AppData = {
  questions: Question[];
  answered: AnsweredEntry[];
  loading: boolean;
  refreshAnswered: () => Promise<void>;
};

const AppDataContext = createContext<AppData>({
  questions: [],
  answered: [],
  loading: true,
  refreshAnswered: async () => {},
});

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answered, setAnswered] = useState<AnsweredEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    Promise.all([
      fetch("/api/questions").then((r) => r.json()),
      fetch("/api/answered").then((r) => r.json()),
    ]).then(([qs, ans]: [Question[], AnsweredEntry[]]) => {
      setQuestions(qs.filter((q) => q.answer !== ""));
      setAnswered(ans);
      setLoading(false);
    });
  }, []);

  async function refreshAnswered() {
    const ans: AnsweredEntry[] = await fetch("/api/answered").then((r) => r.json());
    setAnswered(ans);
  }

  return (
    <AppDataContext.Provider value={{ questions, answered, loading, refreshAnswered }}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);
