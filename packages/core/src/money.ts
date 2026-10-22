import { PLANCK_WEI, TPOT_WEI } from "./constants.js";

export function assertPlanck(wei: bigint, label = "amount"): void {
  if (wei <= 0n) throw new Error(`${label} must be positive`);
  if (wei % PLANCK_WEI !== 0n) {
    throw new Error(`${label} must be a multiple of ${PLANCK_WEI} wei (1 planck)`);
  }
}

/** Royalty for one inclusion: deposit * bps / 10_000, rounded down to a planck. */
export function royaltyWei(depositWei: bigint, royaltyBps: number): bigint {
  if (!Number.isInteger(royaltyBps) || royaltyBps <= 0 || royaltyBps > 10_000) {
    throw new Error("royalty bps must be an integer from 1 to 10000");
  }
  const raw = (depositWei * BigInt(royaltyBps)) / 10_000n;
  const aligned = raw - (raw % PLANCK_WEI);
  if (aligned <= 0n) throw new Error("royalty rounded to zero; raise the deposit or the bps");
  return aligned;
}

export function parseTpot(input: string): bigint {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error("enter an amount of tPOT");
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > 18) throw new Error("tPOT supports 18 decimal places on the EVM side");
  const padded = frac.padEnd(18, "0");
  return BigInt(whole) * TPOT_WEI + BigInt(padded);
}

export function formatTpot(wei: bigint, digits = 4): string {
  const sign = wei < 0n ? "-" : "";
  const abs = wei < 0n ? -wei : wei;
  const whole = abs / TPOT_WEI;
  const frac = (abs % TPOT_WEI).toString().padStart(18, "0").slice(0, digits).replace(/0+$/, "");
  return frac ? `${sign}${whole}.${frac}` : `${sign}${whole}`;
}

export function vestingSchedule(lockedPlanck: bigint, blocks: bigint, startingBlock: bigint) {
  if (blocks <= 0n) throw new Error("vesting blocks must be positive");
  if (lockedPlanck <= 0n) throw new Error("vesting locked amount must be positive");
  if (lockedPlanck % blocks !== 0n) {
    throw new Error("locked planck must divide evenly by the block count");
  }
  const perBlock = lockedPlanck / blocks;
  if (perBlock === 0n) throw new Error("per-block amount rounded to zero");
  return { locked: lockedPlanck, perBlock, startingBlock };
}
