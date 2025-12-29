async function checkRole(req, ctx) {
  const { member } = ctx;
  if (!member || !req.roleId) return false;
  const hasRole = member.roles.cache.has(req.roleId);
  if (req.mode === "not_have") {
    return !hasRole;
  }
  return hasRole;
}
export {
  checkRole
};
