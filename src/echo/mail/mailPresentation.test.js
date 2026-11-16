import test from "node:test";
import assert from "node:assert/strict";
import { emailBodyBlocks, linkedText } from "./mailPresentation.js";

test("email text exposes safe web links without swallowing punctuation", () => {
  const parts = linkedText("Open https://example.com/path?q=1, or www.example.org/help.");
  assert.deepEqual(parts.filter((part) => part.href), [
    { text: "https://example.com/path?q=1", href: "https://example.com/path?q=1" },
    { text: "www.example.org/help", href: "https://www.example.org/help" },
  ]);
  assert.equal(parts.map((part) => part.text).join(""), "Open https://example.com/path?q=1, or www.example.org/help.");
});

test("email text does not turn non-web schemes into links", () => {
  assert.equal(linkedText("javascript:alert(1)").some((part) => part.href), false);
});

test("email body separates paragraphs, lists, quotes, and signatures", () => {
  assert.deepEqual(emailBodyBlocks("Hello Rudy,\n\n- First\n- Second\n\n> Earlier reply\n\n-- \nKhalil"), [
    { type: "paragraph", lines: ["Hello Rudy,"] },
    { type: "unordered-list", lines: ["First", "Second"] },
    { type: "quote", lines: ["Earlier reply"] },
    { type: "signature", lines: ["Khalil"] },
  ]);
});
