import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("allows a same-origin absolute path", () => {
    expect(safeNextPath("/uk/session", "uk")).toBe("/uk/session");
    expect(safeNextPath("/uk/progress?tab=weight", "uk")).toBe(
      "/uk/progress?tab=weight",
    );
  });

  it("falls back to the locale home when nothing is supplied", () => {
    expect(safeNextPath(null, "uk")).toBe("/uk");
    expect(safeNextPath(undefined, "en")).toBe("/en");
    expect(safeNextPath("", "uk")).toBe("/uk");
  });

  it("rejects absolute URLs to another origin", () => {
    expect(safeNextPath("https://evil.example", "uk")).toBe("/uk");
    expect(safeNextPath("http://evil.example/x", "uk")).toBe("/uk");
  });

  it("rejects protocol-relative URLs that start with a slash", () => {
    // The classic bypass: it looks like a path, but browsers resolve it to
    // another origin.
    expect(safeNextPath("//evil.example", "uk")).toBe("/uk");
    expect(safeNextPath("//evil.example/path", "uk")).toBe("/uk");
  });

  it("rejects backslash variants that some browsers normalise", () => {
    expect(safeNextPath("/\\evil.example", "uk")).toBe("/uk");
    expect(safeNextPath("/a\\b", "uk")).toBe("/uk");
  });

  it("rejects embedded whitespace and control characters", () => {
    expect(safeNextPath("/uk /session", "uk")).toBe("/uk");
    expect(safeNextPath("/uk\n/session", "uk")).toBe("/uk");
  });

  it("rejects scheme-like values that do not start with a slash", () => {
    expect(safeNextPath("javascript:alert(1)", "uk")).toBe("/uk");
    expect(safeNextPath("data:text/html,x", "uk")).toBe("/uk");
  });
});
