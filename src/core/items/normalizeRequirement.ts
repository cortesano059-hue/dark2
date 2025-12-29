import type { NormalizedRequirement } from "./types";

export function normalizeRequirement(input: string): NormalizedRequirement {
  const [type, op, value] = input.split(":");
  return {
    type,
    op,
    value: isNaN(Number(value)) ? value : Number(value),
  };
}