import { homeRoute } from "./home.js";
import { authRoutes } from "./auth.js";
import { guildRoutes } from "./guilds.js";
import { economyRoutes } from "./economy.js";
import { botRoutes } from "./bot.js";
function registerRoutes(app, client) {
  homeRoute(app, client);
  app.register((api, opts, done) => {
    authRoutes(api, client);
    guildRoutes(api, client);
    economyRoutes(api, client);
    botRoutes(api, client);
    done();
  }, { prefix: "/api" });
}
export {
  registerRoutes
};
