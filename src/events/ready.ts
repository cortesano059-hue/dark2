import { Events, Routes, REST } from "discord.js";
import logger from "@src/utils/logger";
import { DutyStatus, IncomeRole, User } from "@src/database/mongodb";
import { env } from "#env";
import MyClient from "../structures/MyClient.js";

export default {
    name: Events.ClientReady,
    once: true,

    async execute(client: MyClient): Promise<void> {
        logger.info(`🤖 Bot conectado como ${client.user?.tag}`);

        const commands = client.commandArray || (client as any).commandsArray;

        if (!commands || commands.length === 0) {
            logger.error("❌ No hay comandos cargados para registrar.");
        } else {
            logger.info("📝 Registrando comandos GLOBAL y GUILD...");

            const rest = new REST({ version: "10" }).setToken(env.BOT_TOKEN);

            try {
                await rest.put(
                    Routes.applicationCommands(client.user!.id),
                    { body: commands }
                );
                logger.info(`🌍 Registrados ${commands.length} comandos GLOBAL.`);
            } catch (err) {
                logger.error("❌ Error registrando comandos GLOBAL:", err);
            }

            if (env.GUILD_ID) {
                try {
                    await rest.put(
                        Routes.applicationGuildCommands(
                            client.user!.id,
                            env.GUILD_ID
                        ),
                        { body: commands }
                    );
                    logger.info(`🏠 Registrados ${commands.length} comandos en la GUILD.`);
                } catch (err) {
                    logger.error("❌ Error registrando comandos GUILD:", err);
                }
            }

            logger.info("📌 Registro automático completado.");
        }

        setInterval(async () => {
            try {
                const now = Date.now();
                const allDutyUsers = await DutyStatus.find({});

                for (const duty of allDutyUsers) {
                    const diffMs = now - duty.lastPayment.getTime();
                    const diffHours = diffMs / (1000 * 60 * 60);

                    if (diffHours < 1) continue;

                    const incomeRole = await IncomeRole.findOne({
                        guildId: duty.guildId,
                        roleId: duty.roleId,
                    });

                    if (!incomeRole || !incomeRole.incomePerHour) {
                        logger.warn(
                            `⚠ Usuario ${duty.userId} tenía duty pero NO tiene income configurado. Eliminando duty.`
                        );

                        await DutyStatus.deleteOne({
                            userId: duty.userId,
                            guildId: duty.guildId,
                        });

                        continue;
                    }

                    const salary = incomeRole.incomePerHour;

                    await User.findOneAndUpdate(
                        { userId: duty.userId, guildId: duty.guildId },
                        { $inc: { bank: salary } },
                        { upsert: true }
                    );

                    duty.lastPayment = new Date();
                    await duty.save();

                    const guild = client.guilds.cache.get(duty.guildId);
                    const channel = guild?.channels?.cache.get(duty.channelId);

                    if (channel && 'send' in channel) {
                        channel.send({
                            content: `<@${duty.userId}>`,
                            embeds: [
                                {
                                    title: "💵 Pago por servicio (1h)",
                                    description: `Has recibido **$${salary}** por tu última hora de servicio.`,
                                    color: 0x2ecc71,
                                    footer: {
                                        text: "Sistema automático de salarios",
                                    },
                                },
                            ],
                        }).catch(() => {});
                    }
                }
            } catch (err) {
                logger.error("❌ Error en el sistema de pagos automáticos:", err);
            }
        }, 60 * 1000);

        logger.info("⏱ Sistema automático de salarios iniciado.");
    },
};

