"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAppData } from "@/lib/app-data-context";

type Filter = "all" | "correct" | "wrong" | "unanswered";

export default function QuestionsPage() {
  const { questions, answered, loading } = useAppData();
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const statusMap = useMemo(
    () => new Map(answered.map((a) => [a.questionNum, a.status])),
    [answered]
  );

  const allTopics = [...new Set(questions.flatMap((q) => q.topics ?? []))].sort();

  const topicFiltered = selectedTopic
    ? questions.filter((q) => q.topics?.includes(selectedTopic))
    : questions;

  const correctCount = [...statusMap.values()].filter((s) => s === "정답").length;
  const wrongCount = [...statusMap.values()].filter((s) => s === "오답").length;
  const unansweredCount = questions.filter((q) => !statusMap.has(q.num)).length;

  const filtered = topicFiltered.filter((q) => {
    if (filter === "correct") return statusMap.get(q.num) === "정답";
    if (filter === "wrong") return statusMap.get(q.num) === "오답";
    if (filter === "unanswered") return !statusMap.has(q.num);
    return true;
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: `전체 (${questions.length})` },
    { key: "correct", label: `정답 (${correctCount})` },
    { key: "wrong", label: `오답 (${wrongCount})` },
    { key: "unanswered", label: `미풀기 (${unansweredCount})` },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">문제 목록</h1>
        <p className="text-sm text-gray-500 mt-0.5">문제를 눌러 해당 문제로 바로 이동</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Topic filter */}
      {!loading && allTopics.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">토픽</p>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedTopic(null)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedTopic === null
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              전체
            </button>
            {allTopics.map((topic) => {
              const count = questions.filter((q) => q.topics?.includes(topic)).length;
              return (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(selectedTopic === topic ? null : topic)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedTopic === topic
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {topic} <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Result count */}
      {!loading && selectedTopic && (
        <p className="text-xs text-gray-400">
          <span className="font-semibold text-indigo-600">{selectedTopic}</span> 관련 문제{" "}
          {filtered.length}개
        </p>
      )}

      {loading ? (
        <div className="text-center text-gray-400 text-sm py-20">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-20">해당 문제가 없어요</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((q) => {
            const status = statusMap.get(q.num);
            return (
              <Link
                key={q.num}
                href={`/?q=${q.num}`}
                className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
              >
                <span
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    status === "정답"
                      ? "bg-green-100 text-green-600"
                      : status === "오답"
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {q.num}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 line-clamp-2 leading-snug">{q.question}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    {status && (
                      <span
                        className={`text-[10px] font-semibold ${
                          status === "정답" ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {status}
                      </span>
                    )}
                    {q.topics?.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          selectedTopic === t
                            ? "bg-indigo-100 text-indigo-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                    {(q.topics?.length ?? 0) > 3 && (
                      <span className="text-[10px] text-gray-300">+{q.topics.length - 3}</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-gray-300 text-sm">›</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
