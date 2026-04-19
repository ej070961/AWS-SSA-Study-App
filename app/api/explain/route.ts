import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getQuestionEntry, saveOrUpdateQuestion } from "@/lib/notion";
import type { OptionKey } from "@/types";

export async function POST(req: NextRequest) {
  const { questionNum, question, options, answer, myAnswer } = await req.json();

  const isCorrect = myAnswer === answer;
  const status = isCorrect ? "정답" : "오답";
  const myAnswerText = `${myAnswer}. ${options[myAnswer as OptionKey] ?? ""}`;
  const correctAnswerText = `${answer}. ${options[answer as OptionKey] ?? ""}`;

  const notionPageId = await saveOrUpdateQuestion(
    questionNum,
    question,
    status,
    myAnswerText,
    correctAnswerText,
    options
  );

  // 저장 후 해설이 있으면 함께 반환
  const entry = await getQuestionEntry(questionNum);

  revalidateTag("answered", { expire: 0 });

  return NextResponse.json({
    notionPageId,
    keyConcept: entry?.keyConcept ?? "",
    explanation: entry?.explanation ?? "",
    status,
  });
}
