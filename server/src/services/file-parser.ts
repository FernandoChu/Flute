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
        // Strip HTML tags to get plain text
        const text = raw
          // Convert block-level tags to newlines to preserve paragraph breaks
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/?(p|div|h[1-6]|blockquote|li|tr)\b[^>]*>/gi, "\n")
          // Strip remaining HTML tags
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          // Collapse spaces/tabs within lines but preserve newlines
          .replace(/[^\S\n]+/g, " ")
          // Collapse multiple blank lines into one
          .replace(/\n{3,}/g, "\n\n")
          .trim();
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
