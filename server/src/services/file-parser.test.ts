import { describe, it, expect } from "vitest";
import { parseTxt, parseSrt, htmlToText } from "./file-parser";

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

describe("htmlToText", () => {
  it("converts simple paragraphs with double newline separation", () => {
    const html = "<p>First paragraph.</p><p>Second paragraph.</p>";
    expect(htmlToText(html)).toBe("First paragraph.\n\nSecond paragraph.");
  });

  it("handles br tags as single newlines", () => {
    const html = "<p>Line one<br>Line two</p>";
    expect(htmlToText(html)).toBe("Line one\nLine two");
  });

  it("handles self-closing br tags", () => {
    const html = "<p>Line one<br/>Line two<br />Line three</p>";
    expect(htmlToText(html)).toBe("Line one\nLine two\nLine three");
  });

  it("strips inline tags without adding newlines", () => {
    const html = "<p>This is <em>italic</em> and <strong>bold</strong> text.</p>";
    expect(htmlToText(html)).toBe("This is italic and bold text.");
  });

  it("decodes HTML entities", () => {
    const html = "<p>Tom &amp; Jerry &lt;3&gt; &quot;friends&quot; it&#39;s</p>";
    expect(htmlToText(html)).toBe('Tom & Jerry <3> "friends" it\'s');
  });

  it("converts &nbsp; to regular spaces", () => {
    const html = "<p>Word&nbsp;&nbsp;another</p>";
    expect(htmlToText(html)).toBe("Word another");
  });

  it("collapses excessive blank lines to one", () => {
    const html = "<p>A</p><p></p><p></p><p>B</p>";
    expect(htmlToText(html)).toBe("A\n\nB");
  });

  it("handles heading tags as block elements", () => {
    const html = "<h1>Title</h1><p>Content here.</p>";
    expect(htmlToText(html)).toBe("Title\n\nContent here.");
  });

  it("handles div and blockquote as block elements", () => {
    const html = "<div>Section one</div><blockquote>A quote</blockquote><div>Section two</div>";
    expect(htmlToText(html)).toBe("Section one\n\nA quote\n\nSection two");
  });

  it("handles nested tags", () => {
    const html = "<div><p>Nested <span>content</span></p></div>";
    expect(htmlToText(html)).toBe("Nested content");
  });

  it("strips leading and trailing spaces on each line", () => {
    const html = "<p>  Hello  </p><p>  World  </p>";
    expect(htmlToText(html)).toBe("Hello\n\nWorld");
  });

  it("collapses multiple inline spaces to one", () => {
    const html = "<p>Too   many    spaces</p>";
    expect(htmlToText(html)).toBe("Too many spaces");
  });

  it("handles realistic epub chapter HTML", () => {
    const html = `
      <h2>Chapter One</h2>
      <p>It was a dark and stormy night.</p>
      <p>The wind howled through the trees.</p>
      <p>&quot;Who goes there?&quot; she asked.</p>
    `;
    const result = htmlToText(html);
    expect(result).toBe(
      'Chapter One\n\nIt was a dark and stormy night.\n\nThe wind howled through the trees.\n\n"Who goes there?" she asked.'
    );
  });

  it("handles whitespace between tags in source HTML", () => {
    const html = "<p>First.</p>\n\n  <p>Second.</p>\n\n  <p>Third.</p>";
    expect(htmlToText(html)).toBe("First.\n\nSecond.\n\nThird.");
  });

  it("handles list items", () => {
    const html = "<ul><li>Item one</li><li>Item two</li><li>Item three</li></ul>";
    expect(htmlToText(html)).toBe("Item one\n\nItem two\n\nItem three");
  });

  it("collapses source newlines inside paragraphs into spaces", () => {
    // Epub generators often hard-wrap lines in the HTML source
    const html = "<p>This is a long sentence that was\nwrapped in the HTML source\nfor readability.</p>";
    expect(htmlToText(html)).toBe(
      "This is a long sentence that was wrapped in the HTML source for readability."
    );
  });

  it("collapses source newlines between tags into nothing", () => {
    const html = "<p>First.</p>\n<p>Second.</p>\n<p>Third.</p>";
    expect(htmlToText(html)).toBe("First.\n\nSecond.\n\nThird.");
  });

  it("handles indented source HTML without extra whitespace", () => {
    const html = `<div>
      <p>
        Hello world.
      </p>
      <p>
        Goodbye world.
      </p>
    </div>`;
    expect(htmlToText(html)).toBe("Hello world.\n\nGoodbye world.");
  });

  it("returns empty string for empty or whitespace-only content", () => {
    expect(htmlToText("<p>  </p>")).toBe("");
    expect(htmlToText("  ")).toBe("");
    expect(htmlToText("<div></div>")).toBe("");
  });

  it("handles br tag before closing p tag without extra blank lines", () => {
    const html = "<p>Text<br></p><p>Next paragraph.</p>";
    expect(htmlToText(html)).toBe("Text\n\nNext paragraph.");
  });
});
