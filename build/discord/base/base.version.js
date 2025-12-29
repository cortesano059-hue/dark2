import { env } from "#env";
import ck from "chalk";
const isBun = typeof Bun !== "undefined";
env.BASE_VERSION = "1.4.11";
const RUNTIME_VERSION = isBun ? Bun.version : process.versions.node;
const engineName = isBun ? `${ck.hex("#F9F1E1")("\u25CC Bun")}` : `${ck.hex("#54A044")("\u2B22 Node.js")}`;
const runtimeDisplay = `${engineName} ${ck.reset.dim(RUNTIME_VERSION)}`;
export {
  runtimeDisplay
};
