import { Client } from "discord.js";
import { FastifyInstance } from "fastify";
import axios from "axios";
import { env } from "#env";
import { StatusCodes } from "http-status-codes";

export function authRoutes(app: FastifyInstance, _client: Client<true>) {

    // Redirect to Discord OAuth2
    app.get("/auth/login", async (_req, res) => {
        const url = `https://discord.com/api/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(env.DASHBOARD_URL + "/api/auth/callback")}&response_type=code&scope=identify%20guilds`;
        return res.redirect(url);
    });

    // Callback from Discord
    app.get("/auth/callback", async (req, res) => {
        const { code } = req.query as { code: string };
        if (!code) return res.status(StatusCodes.BAD_REQUEST).send({ error: "No code provided" });

        try {
            // Exchange code for token
            const tokenResponse = await axios.post("https://discord.com/api/oauth2/token", new URLSearchParams({
                client_id: env.DISCORD_CLIENT_ID!,
                client_secret: env.DISCORD_CLIENT_SECRET!,
                grant_type: "authorization_code",
                code,
                redirect_uri: env.DASHBOARD_URL + "/api/auth/callback",
            }).toString(), {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });

            const { access_token } = tokenResponse.data;

            // Get User Info
            const userResponse = await axios.get("https://discord.com/api/users/@me", {
                headers: { Authorization: `Bearer ${access_token}` }
            });

            const userData = userResponse.data;

            // Create JWT
            const token = app.jwt.sign({
                id: userData.id,
                username: userData.username,
                avatar: userData.avatar,
                discriminator: userData.discriminator,
                accessToken: access_token
            });

            // Set cookie and redirect back to dashboard
            return res
                .setCookie("token", token, {
                    path: "/",
                    secure: false, // Cambiado para desarrollo local
                    httpOnly: true,
                    sameSite: "lax", // Cambiado para desarrollo local
                })
                .redirect(env.DASHBOARD_URL);

        } catch (error: any) {
            console.error("Auth Error:", error.response?.data || error.message);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: "Authentication failed" });
        }
    });

    // Get current user
    app.get("/auth/@me", async (req, res) => {
        try {
            const token = req.cookies.token;
            if (!token) return res.status(StatusCodes.UNAUTHORIZED).send({ error: "Not logged in" });

            const decoded = app.jwt.verify(token);
            return res.send(decoded);
        } catch (error) {
            return res.status(StatusCodes.UNAUTHORIZED).send({ error: "Invalid token" });
        }
    });

    // Logout
    app.get("/auth/logout", async (_req, res) => {
        return res
            .clearCookie("token", { path: "/" })
            .send({ success: true });
    });
}
