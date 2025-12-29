async function actionRole(action, ctx) {
  const { member, guild } = ctx;
  if (!member || !guild || !action.roleId) return;
  const role = guild.roles.cache.get(action.roleId);
  if (!role) return;
  if (action.mode === "add") {
    try {
      await member.roles.add(role);
      if (ctx.rolesGiven) ctx.rolesGiven.push(role.id);
    } catch (err) {
      console.error(`\u274C Error adding role ${role.name}:`, err);
    }
  }
  if (action.mode === "remove") {
    try {
      await member.roles.remove(role);
      if (ctx.rolesRemoved) ctx.rolesRemoved.push(role.id);
    } catch (err) {
      console.error(`\u274C Error removing role ${role.name}:`, err);
    }
  }
}
export {
  actionRole
};
