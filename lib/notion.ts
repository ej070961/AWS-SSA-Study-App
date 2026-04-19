import { Client } from "@notionhq/client";
import { unstable_cache } from "next/cache";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import type { ContentBlock, NoteContent, NoteResponse, WrongEntry } from "@/types";

export const notion = new Client({ auth: process.env.NOTION_API_KEY });

// ─── 학습 노트 DB ───────────────────────────────────────────────

export async function getNoteTopics(): Promise<string[]> {
  const res = await notion.databases.query({
    database_id: process.env.NOTION_DB_NOTES!,
    sorts: [{ property: "Topic", direction: "ascending" }],
  });
  return res.results
    .map((p: any) => p.properties.Topic?.title?.[0]?.plain_text ?? "")
    .filter(Boolean);
}

export async function getNoteByTopic(topic: string): Promise<NoteResponse | null> {
  const res = await notion.databases.query({
    database_id: process.env.NOTION_DB_NOTES!,
    filter: { property: "Topic", title: { equals: topic } },
  });

  if (!res.results.length) return null;
  const page = res.results[0] as any;

  const blocks = await notion.blocks.children.list({ block_id: page.id });
  const content = parseNoteBlocks(blocks.results as BlockObjectResponse[]);

  return {
    topic: page.properties.Topic?.title?.[0]?.plain_text ?? topic,
    domain: page.properties.Domain?.select?.name ?? "",
    status: page.properties.Status?.select?.name ?? "",
    summary: page.properties.Summary?.rich_text?.[0]?.plain_text ?? "",
    content,
    notionUrl: `https://www.notion.so/${page.id.replace(/-/g, "")}`,
  };
}

function parseNoteBlocks(blocks: BlockObjectResponse[]): NoteContent {
  type RawSection = { title: string; introBlocks: ContentBlock[]; subsections: { title: string; blocks: ContentBlock[] }[] };

  const sections: RawSection[] = [];
  let currentSection: RawSection | null = null;
  let currentSub: { title: string; blocks: ContentBlock[] } | null = null;
  let pendingLines: string[] = [];

  function currentTarget(): ContentBlock[] {
    return currentSub?.blocks ?? currentSection?.introBlocks ?? [];
  }

  function flushLines() {
    if (!pendingLines.length) return;
    currentTarget().push({ type: "text", text: pendingLines.join("\n") });
    pendingLines = [];
  }

  function flushSub() {
    if (currentSub && currentSection) {
      flushLines();
      currentSection.subsections.push(currentSub);
      currentSub = null;
    }
  }

  function parseRichText(richText: any[]): string {
    return richText
      .map((r: any) => (r.annotations?.code ? `\`${r.plain_text}\`` : r.plain_text))
      .join("");
  }

  for (const block of blocks) {
    const type = block.type;

    if (type === "heading_2") {
      flushLines();
      flushSub();
      if (currentSection) sections.push(currentSection);
      const title = (block as any).heading_2?.rich_text?.map((r: any) => r.plain_text).join("") ?? "";
      currentSection = { title, introBlocks: [], subsections: [] };
      continue;
    }

    if (type === "heading_3") {
      flushLines();
      flushSub();
      const title = (block as any).heading_3?.rich_text?.map((r: any) => r.plain_text).join("") ?? "";
      currentSub = { title, blocks: [] };
      continue;
    }

    if (!currentSection) continue;

    if (type === "code") {
      flushLines();
      const richText = (block as any).code?.rich_text ?? [];
      const text = richText.map((r: any) => r.plain_text).join("");
      const language = (block as any).code?.language ?? "";
      currentTarget().push({ type: "code", text, language });
      continue;
    }

    const richText = (block as any)[type]?.rich_text ?? (block as any)[type]?.text ?? [];
    const text = parseRichText(richText);
    if (!text) continue;
    pendingLines.push(type === "bulleted_list_item" ? `• ${text}` : text);
  }

  flushLines();
  flushSub();
  if (currentSection) sections.push(currentSection);

  return sections.map((s) => ({
    title: s.title,
    blocks: s.introBlocks,
    subsections: s.subsections,
  }));
}

// ─── 해설 DB ────────────────────────────────────────────────────

export async function getQuestionEntry(questionNum: number) {
  const res = await notion.databases.query({
    database_id: process.env.NOTION_DB_EXPLAIN!,
    filter: { property: "Question Number", number: { equals: questionNum } },
  });
  if (!res.results.length) return null;

  const page = res.results[0] as any;
  return {
    notionPageId: page.id,
    keyConcept: page.properties["Key Concept"]?.rich_text?.[0]?.plain_text ?? "",
    explanation: page.properties.Explanation?.rich_text?.[0]?.plain_text ?? "",
    status: page.properties.Status?.select?.name ?? "",
  };
}

export async function saveOrUpdateQuestion(
  questionNum: number,
  questionTitle: string,
  status: "정답" | "오답",
  myAnswer: string,
  correctAnswer: string,
  options: Record<string, string>
): Promise<string> {
  const existing = await getQuestionEntry(questionNum);

  if (existing) {
    await notion.pages.update({
      page_id: existing.notionPageId,
      properties: {
        Status: { select: { name: status } },
        "My Answer": { rich_text: [{ text: { content: myAnswer } }] },
        "Correct Answer": { rich_text: [{ text: { content: correctAnswer } }] },
      },
    });
    return existing.notionPageId;
  }

  const optionBlocks = Object.entries(options).map(([key, value]) => ({
    object: "block" as const,
    type: "bulleted_list_item" as const,
    bulleted_list_item: {
      rich_text: [{ type: "text" as const, text: { content: `${key}. ${value}` } }],
    },
  }));

  const page = await notion.pages.create({
    parent: { database_id: process.env.NOTION_DB_EXPLAIN! },
    properties: {
      Question: {
        title: [{ text: { content: `Q.${questionNum} - ${questionTitle.slice(0, 50)}` } }],
      },
      "Question Number": { number: questionNum },
      "Key Concept": { rich_text: [{ text: { content: "" } }] },
      Explanation: { rich_text: [{ text: { content: "" } }] },
      Status: { select: { name: status } },
      "My Answer": { rich_text: [{ text: { content: myAnswer } }] },
      "Correct Answer": { rich_text: [{ text: { content: correctAnswer } }] },
      Reviewed: { checkbox: false },
      "Review Count": { number: 0 },
    },
    children: [
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "📝 문제" } }],
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: questionTitle } }],
        },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "📋 선지" } }],
        },
      },
      ...optionBlocks,
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "💡 해설" } }],
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: "" } }],
        },
      },
    ],
  });
  return page.id;
}

export const getAnsweredQuestions = unstable_cache(
  async (): Promise<{ questionNum: number; status: string }[]> => {
    const res = await notion.databases.query({
      database_id: process.env.NOTION_DB_EXPLAIN!,
      filter: {
        property: "Status",
        select: { is_not_empty: true },
      },
    });
    return res.results.map((p: any) => ({
      questionNum: p.properties["Question Number"]?.number ?? 0,
      status: p.properties.Status?.select?.name ?? "",
    }));
  },
  ["answered-questions"],
  { revalidate: 60, tags: ["answered"] }
);

export async function getWrongList(): Promise<WrongEntry[]> {
  const res = await notion.databases.query({
    database_id: process.env.NOTION_DB_EXPLAIN!,
    filter: { property: "Status", select: { equals: "오답" } },
    sorts: [{ property: "Date Added", direction: "descending" }],
  });

  return res.results.map((p: any) => ({
    notionPageId: p.id,
    questionNum: p.properties["Question Number"]?.number ?? 0,
    question: p.properties.Question?.title?.[0]?.plain_text ?? "",
    keyConcept: p.properties["Key Concept"]?.rich_text?.[0]?.plain_text ?? "",
    explanation: p.properties.Explanation?.rich_text?.[0]?.plain_text ?? "",
    myAnswer: p.properties["My Answer"]?.rich_text?.[0]?.plain_text ?? "",
    correctAnswer: p.properties["Correct Answer"]?.rich_text?.[0]?.plain_text ?? "",
    domain: p.properties.Domain?.select?.name ?? "",
    reviewed: p.properties.Reviewed?.checkbox ?? false,
    reviewCount: p.properties["Review Count"]?.number ?? 0,
    dateAdded: p.properties["Date Added"]?.created_time ?? "",
  }));
}

export async function updateReviewed(notionPageId: string, reviewed: boolean): Promise<void> {
  await notion.pages.update({
    page_id: notionPageId,
    properties: {
      Reviewed: { checkbox: reviewed },
      "Review Count": { number: reviewed ? 1 : 0 },
    },
  });
}
