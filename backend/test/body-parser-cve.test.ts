import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

/**
 * CVE-2026-111181 (GHSA-27r3-jxmh-p828)
 *
 * body-parser < 2.4.0 contains a Denial of Service vulnerability: a request
 * with a compressed body (Content-Encoding: gzip/deflate) followed by trailing
 * bytes can leave the decompression stream piped with no error listener, so the
 * trailing bytes reach the finished decoder and emit an uncaught exception that
 * terminates the process. The fix (body-parser 2.4.0) detaches and destroys the
 * decompression stream once the body has been read.
 *
 * body-parser is consumed transitively by express (backend dependency). This
 * test guards that the patched version is actually what is installed and used
 * by the runtime, so a future downgrade or stale lockfile is caught.
 */
const require = createRequire(import.meta.url);
const installed = require("body-parser/package.json");

function parseVersion(v: string): number[] {
  return v.split(".").map((n) => Number.parseInt(n, 10));
}

describe("CVE-2026-111181: body-parser compressed-body DoS fix", () => {
  it("installs body-parser >= 2.4.0 (the patched version)", () => {
    const [major, minor] = parseVersion(installed.version);
    expect(major).toBe(2);
    expect(minor).toBeGreaterThanOrEqual(4);
  });
});
