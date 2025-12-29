import { normalizeAction } from "./normalizeAction";
async function runItem(actions, ctx) {
  for (const raw of actions) {
    const action = normalizeAction(raw);
    const handler = ctx.actions[action.type];
    if (!handler) continue;
    await handler(action, ctx);
  }
}
export {
  runItem
};
