async function actionMessage(action, ctx) {
  if (!action.text) return;
  ctx.customMessage = action.text.replace(/{item}/gi, ctx.item?.itemName ?? "el item");
}
export {
  actionMessage
};
