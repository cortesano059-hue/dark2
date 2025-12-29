function normalizeAction(raw) {
  const parts = raw.split(":");
  const [type] = parts;
  if (type === "money") {
    const op = parts[1];
    const value = parts[2];
    return {
      type: "money",
      target: "money",
      mode: op,
      amount: Number(value)
    };
  }
  if (type === "bank") {
    const op = parts[1];
    const value = parts[2];
    return {
      type: "money",
      // We treat bank as money action with target bank
      target: "bank",
      mode: op,
      amount: Number(value)
    };
  }
  if (type === "role") {
    const op = parts[1];
    const value = parts[2];
    return {
      type: "role",
      mode: op,
      roleId: value
    };
  }
  if (type === "item") {
    const op = parts[1];
    const name = parts[2];
    const amount = parts[3];
    return {
      type: "item",
      mode: op,
      itemName: name,
      amount: Number(amount ?? 1)
    };
  }
  if (type === "message") {
    const content = raw.substring(8);
    return {
      type: "message",
      text: content
    };
  }
  return {
    type: "message",
    text: raw
  };
}
export {
  normalizeAction
};
