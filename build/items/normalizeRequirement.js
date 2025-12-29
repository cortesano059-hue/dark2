function normalizeRequirement(raw) {
  const parts = raw.split(":");
  const [type, a, b] = parts;
  if (type === "money") {
    return {
      type: "money",
      target: "money",
      value: Number(a),
      source: "wallet"
    };
  }
  if (type === "bank") {
    return {
      type: "money",
      target: "bank",
      value: Number(a),
      source: "bank"
    };
  }
  if (type === "item") {
    return {
      type: "item",
      item: a,
      amount: Number(b ?? 1)
    };
  }
  if (type === "role") {
    return {
      type: "role",
      roleId: a
    };
  }
  throw new Error(`Unknown requirement: ${raw}`);
}
export {
  normalizeRequirement
};
