import { describe, it, expect } from "vitest";
import { parseTxt, parseSrt } from "./file-parser";

describe("parseTxt", () => {
  it("parses a text buffer into a single lesson", () => {
    const buffer = Buffer.from("This is the content of the lesson.");
    const result = parseTxt(buffer, "my-lesson.txt");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("my-lesson");
    expect(result[0].textContent).toBe("This is the content of the lesson.");
  });

  it("trims whitespace from content", () => {
    const buffer = Buffer.from("  \n  Hello world  \n  ");
    const result = parseTxt(buffer, "test.txt");

    expect(result[0].textContent).toBe("Hello world");
  });

  it("strips .txt extension from title", () => {
    const result = parseTxt(Buffer.from("x"), "Chapter 1.txt");
    expect(result[0].title).toBe("Chapter 1");
  });
});

describe("parseSrt", () => {
  it("parses SRT content into a single lesson", () => {
    const srt = `1
00:00:00,000 --> 00:00:02,000
Hello world

2
00:00:02,000 --> 00:00:04,000
How are you
`;
    const buffer = Buffer.from(srt);
    const result = parseSrt(buffer, "subtitles.srt");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("subtitles");
    expect(result[0].textContent).toContain("Hello world");
    expect(result[0].textContent).toContain("How are you");
  });

  it("strips .srt extension from title", () => {
    const srt = `1\n00:00:00,000 --> 00:00:01,000\nHi\n`;
    const result = parseSrt(Buffer.from(srt), "Episode 1.srt");
    expect(result[0].title).toBe("Episode 1");
  });
});
