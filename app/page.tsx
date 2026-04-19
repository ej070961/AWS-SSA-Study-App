"use client";

import { useEffect, useState, Suspense, startTransition } from "react";
import { useSearchParams } from "next/navigation";
import QuizCard from "@/components/QuizCard";
import ExplanationBox from "@/components/ExplanationBox";
import { useAppData } from "@/lib/app-data-context";
import type { OptionKey } from "@/types";

type ExplainData = {
  notionPageId: string;
  keyConcept: string;
  explanation: string;
  status: "정답" | "오답";
};

function QuizContent() {
  const searchParams = useSearchParams();
  const jumpTo = searchParams.get("q");

  const { questions, answered, refreshAnswered } = useAppData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [selected, setSelected] = useState<OptionKey | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [explainData, setExplainData] = useState<ExplainData | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  const validQuestions = questions;
  const current = validQuestions[currentIndex];

  useEffect(() => {
    setCorrectCount(answered.filter((a) => a.status === "정답").length);
    setWrongCount(answered.filter((a) => a.status === "오답").length);
  }, [answered]);

  useEffect(() => {
    if (!jumpTo || !validQuestions.length) return;
    const idx = validQuestions.findIndex((q) => q.num === Number(jumpTo));
    if (idx !== -1) startTransition(() => setCurrentIndex(idx));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo, validQuestions.length]);

  async function handleReveal() {
    if (!current || !selected) return;
    setRevealed(true);
    setLoadingExplain(true);

    const isCorrect = selected === current.answer;
    if (isCorrect) setCorrectCount((c) => c + 1);
    else setWrongCount((c) => c + 1);

    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionNum: current.num,
        question: current.question,
        options: current.options,
        answer: current.answer,
        myAnswer: selected,
      }),
    });
    const data = await res.json();
    setExplainData(data);
    setLoadingExplain(false);
    refreshAnswered();
  }

  function handleNext() {
    setSelected(null);
    setRevealed(false);
    setExplainData(null);
    setCurrentIndex((i) => i + 1);
  }

  function handleSkip() {
    setSelected(null);
    setCurrentIndex((i) => i + 1);
  }

  if (!questions.length) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400 text-sm">문제 불러오는 중...</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
        <p className="text-4xl">🎉</p>
        <p className="text-lg font-bold text-gray-800">모든 문제를 완료했어요!</p>
        <p className="text-sm text-gray-500">정답 {correctCount}개 / 오답 {wrongCount}개</p>
        <button
          onClick={() => setCurrentIndex(0)}
          className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold"
        >
          처음부터 다시
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 text-xs">
        <span className="text-green-600 font-semibold">✅ {correctCount}</span>
        <span className="text-red-500 font-semibold">❌ {wrongCount}</span>
      </div>

      <QuizCard
        question={current}
        current={currentIndex + 1}
        total={validQuestions.length}
        selected={selected}
        revealed={revealed}
        onSelect={setSelected}
        onReveal={handleReveal}
        onNext={handleNext}
        onSkip={handleSkip}
      />

      {(revealed || loadingExplain) && (
        <ExplanationBox
          keyConcept={explainData?.keyConcept ?? ""}
          explanation={explainData?.explanation ?? ""}
          loading={loadingExplain}
        />
      )}
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="text-center text-gray-400 text-sm py-20">로딩 중...</div>}>
      <QuizContent />
    </Suspense>
  );
}
