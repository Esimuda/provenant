import assert from "node:assert/strict";
import test from "node:test";
import { itemIdFromFingerprint } from "../src/ids.ts";
import type { Hex } from "@provenant/core";

test("item ids stay inside the nft u32 range and move when salted", () => {
  const fingerprint = `0x${"ab".repeat(32)}` as Hex;
  const first = itemIdFromFingerprint(fingerprint, 0);
  const second = itemIdFromFingerprint(fingerprint, 1);
  assert.ok(first >= 1 && first <= 0xffff_fffe);
  assert.notEqual(first, second);
});
