import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { EPub } from "epub2";
import SrtParser from "srt-parser-2";

export interface ParsedLesson {
  title: string;
  textContent: string;
}

export function parseTxt(buffer: Buffer, filename: string): ParsedLesson[] {
  const text = buffer.toString("utf-8").trim();
  const title = filename.replace(/\.txt$/i, "");
  return [{ title, textContent: text }];
}

const PARA = "\u0000P\u0000";
const LINE = "\u0000L\u0000";
// Escaped versions for use in regex
const PARA_RE = "\\u0000P\\u0000";
const LINE_RE = "\\u0000L\\u0000";

export function htmlToText(html: string): string {
  return (
    html
      // Block-level closing tags → paragraph break marker
      .replace(/<\/(p|div|h[1-6]|blockquote|li|tr)>/gi, PARA)
      // <br> → line break marker
      .replace(/<br\s*\/?>/gi, LINE)
      // Strip remaining HTML tags
      .replace(/<[^>]+>/g, "")
      // Decode HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Collapse all whitespace (including source newlines) to single spaces
      .replace(/\s+/g, " ")
      // Any run of markers (with optional spaces) containing at least one PARA → paragraph break
      .replace(new RegExp(`(?:\\s*(?:${PARA_RE}|${LINE_RE})\\s*)*(?:\\s*${PARA_RE}\\s*)(?:\\s*(?:${PARA_RE}|${LINE_RE})\\s*)*`, "g"), "\n\n")
      // Remaining LINE markers → single newline
      .replace(new RegExp(`\\s*${LINE_RE}\\s*`, "g"), "\n")
      .trim()
  );
}

export async function parseEpub(buffer: Buffer): Promise<ParsedLesson[]> {
  // epub2 requires a file path, so write buffer to a temp file
  const tempPath = join(tmpdir(), `flute-${randomUUID()}.epub`);
  writeFileSync(tempPath, buffer);

  try {
    const epub = await EPub.createAsync(tempPath);
    const lessons: ParsedLesson[] = [];

    for (const chapter of epub.flow) {
      if (!chapter.id) continue;
      try {
        const raw = await epub.getChapterAsync(chapter.id);
        const text = htmlToText(raw);
        if (text.length > 0) {
          const title = chapter.title || `Chapter ${lessons.length + 1}`;
          lessons.push({ title, textContent: text });
        }
      } catch {
        // Skip chapters that can't be read
      }
    }

    return lessons;
  } finally {
    try {
      unlinkSync(tempPath);
    } catch {
      // ignore cleanup errors
    }
  }
}

export function parseSrt(buffer: Buffer, filename: string): ParsedLesson[] {
  const parser = new SrtParser();
  const srtContent = buffer.toString("utf-8");
  const parsed = parser.fromSrt(srtContent);
  const text = parsed.map((entry) => entry.text).join("\n");
  const title = filename.replace(/\.srt$/i, "");
  return [{ title, textContent: text }];
}

export async function parseFile(
  buffer: Buffer,
  filename: string,
): Promise<ParsedLesson[]> {
  const ext = filename.toLowerCase().split(".").pop();

  switch (ext) {
    case "txt":
      return parseTxt(buffer, filename);
    case "epub":
      return parseEpub(buffer);
    case "srt":
      return parseSrt(buffer, filename);
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
}
