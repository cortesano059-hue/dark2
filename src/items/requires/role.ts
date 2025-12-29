import { Requirement, EngineContext } from "../types.js";

export async function checkRole(req: Requirement, ctx: EngineContext) {
    const { member } = ctx;
    if (!member || !req.roleId) return false;

    // member.roles.cache might be partial?
    // We assume cache is populated or fetch if needed?
    // Usually cache is enough for active interactions.

    const hasRole = member.roles.cache.has(req.roleId);

    if (req.mode === "not_have") {
        return !hasRole;
    }

    return hasRole;
}
