function normalizeRequirement(input) {
  const [type, op, value] = input.split(":");
  return {
    type,
    op,
    value: isNaN(Number(value)) ? value : Number(value)
  };
}
export {
  normalizeRequirement
};
