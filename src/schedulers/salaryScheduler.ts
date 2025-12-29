
import { DutyStatus, GuildConfig } from "#database";
import { Client, TextChannel } from "discord.js";
import * as eco from "../economy/index.js";
import { logger } from "../utils/logger.js";

export function startSalaryScheduler(client: Client) {

    setInterval(async () => {
        try {
            const now = Date.now();
            const duties = await DutyStatus.find({});

            for (const duty of duties) {
                if (!duty.lastPayment) continue;

                const last = new Date(duty.lastPayment).getTime();
                const diffHours = (now - last) / (1000 * 60 * 60);

                if (diffHours < 1) continue;

                // Find guild config to get role income
                const config = await GuildConfig.findOne({ guildId: duty.guildId }).lean();
                const roleData = config?.incomeRoles?.find(r => r.roleId === duty.roleId);

                if (!roleData || !roleData.incomePerHour) {
                    await DutyStatus.deleteOne({ _id: duty._id });
                    continue;
                }

                const income = roleData.incomePerHour;

                // 💰 PAGO AL BANCO
                await eco.addBank(
                    duty.userId,
                    duty.guildId,
                    income,
                    "salary_auto"
                );

                duty.lastPayment = new Date();
                await duty.save();

                // 📩 ENVÍO DEL EMBED
                const guild = client.guilds.cache.get(duty.guildId) || await client.guilds.fetch(duty.guildId).catch(() => null);
                if (!guild) continue;

                const channel = guild.channels.cache.get(duty.channelId || "") || await guild.channels.fetch(duty.channelId || "").catch(() => null);

                if (channel && channel instanceof TextChannel) {
                    await channel.send({
                        content: `<@${duty.userId}>`,
                        embeds: [
                            {
                                title: "💵 Pago por servicio (1h)",
                                description: `Has recibido **$${income.toLocaleString()}** por tu última hora de servicio.`,
                                color: 0x2ecc71,
                                footer: {
                                    text: "Sistema automático de salarios",
                                },
                            },
                        ],
                    }).catch(() => { });
                }
            }
        } catch (err: any) {
            logger.error("❌ Error en salaryScheduler:", err);
        }
    }, 60 * 1000);
}
