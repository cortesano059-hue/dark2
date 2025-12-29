function normalizeAction(input) {
  const parts = input.split(":");
  const [type, op, value] = parts;
  return {
    type,
    op,
    value: isNaN(Number(value)) ? value : Number(value)
  };
}
export {
  normalizeAction
};
