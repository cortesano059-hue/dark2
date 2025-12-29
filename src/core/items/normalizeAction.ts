import type { NormalizedAction } from "./types";

export function normalizeAction(input: string): NormalizedAction {
  const parts = input.split(":");
  const [type, op, value] = parts;

  return {
    type,
    op,
    value: isNaN(Number(value)) ? value : Number(value),
  };
}