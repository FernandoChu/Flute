import { describe, it, expect } from "vitest";
import { tokenize, normalizeWord } from "./tokenizer";

describe("tokenize", () => {
  it("splits simple English text into word and non-word tokens", () => {
    const tokens = tokenize("Hello world");
    expect(tokens).toEqual([
      { text: "Hello", isWord: true },
      { text: " ", isWord: false },
      { text: "world", isWord: true },
    ]);
  });

  it("handles punctuation as separate non-word tokens", () => {
    const tokens = tokenize("Hello, world!");
    expect(tokens).toHaveLength(4);
    expect(tokens[0]).toEqual({ text: "Hello", isWord: true });
    expect(tokens[1]).toEqual({ text: ", ", isWord: false });
    expect(tokens[2]).toEqual({ text: "world", isWord: true });
    expect(tokens[3]).toEqual({ text: "!", isWord: false });
  });

  it("handles apostrophes and hyphens within words", () => {
    const tokens = tokenize("don't well-known");
    const words = tokens.filter((t) => t.isWord);
    expect(words.map((w) => w.text)).toEqual(["don't", "well-known"]);
  });

  it("handles accented characters", () => {
    const tokens = tokenize("café résumé");
    const words = tokens.filter((t) => t.isWord);
    expect(words.map((w) => w.text)).toEqual(["café", "résumé"]);
  });

  it("tokenizes CJK characters individually", () => {
    const tokens = tokenize("你好世界");
    expect(tokens).toHaveLength(4);
    expect(tokens.every((t) => t.isWord)).toBe(true);
    expect(tokens.map((t) => t.text)).toEqual(["你", "好", "世", "界"]);
  });

  it("handles mixed CJK and Latin text", () => {
    const tokens = tokenize("Hello 你好");
    const words = tokens.filter((t) => t.isWord);
    expect(words.map((t) => t.text)).toEqual(["Hello", "你", "好"]);
  });

  it("handles Japanese hiragana and katakana", () => {
    const tokens = tokenize("こんにちは");
    expect(tokens).toHaveLength(5);
    expect(tokens.every((t) => t.isWord)).toBe(true);
  });

  it("returns empty array for empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("handles multiline text", () => {
    const tokens = tokenize("line one\nline two");
    const words = tokens.filter((t) => t.isWord);
    expect(words.map((t) => t.text)).toEqual(["line", "one", "line", "two"]);
  });
});

describe("normalizeWord", () => {
  it("lowercases text", () => {
    expect(normalizeWord("Hello")).toBe("hello");
  });

  it("trims whitespace", () => {
    expect(normalizeWord("  hello  ")).toBe("hello");
  });

  it("handles already-normalized text", () => {
    expect(normalizeWord("hello")).toBe("hello");
  });
});
