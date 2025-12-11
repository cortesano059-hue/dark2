import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import safeReply from "@src/utils/safeReply";
import { Dni } from "@database/mongodb";

export const data = new SlashCommandBuilder()
    .setName('creardni')
    .setDescription('Crea tu DNI')
    .addStringOption((option: any) => option.setName('nombre').setDescription('Nombre').setRequired(true))
    .addStringOption((option: any) => option.setName('apellido').setDescription('Apellido').setRequired(true))
    .addIntegerOption((option: any) => option.setName('edad').setDescription('Edad').setRequired(true))
    .addStringOption((option: any) => option.setName('nacionalidad').setDescription('Nacionalidad').setRequired(true))
    .addStringOption((option: any) => option.setName('psid').setDescription('ID de PlayStation').setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ });
        const { options, user, guild } = interaction;

        const userId = user.id;
        const guildId = guild.id;
        
        const nombre = options.getString('nombre');
        const apellido = options.getString('apellido');
        const edad = options.getInteger('edad');
        const nacionalidad = options.getString('nacionalidad');
        const psid = options.getString('psid');

        try {
            // CAMBIO 2: Consulta estilo MongoDB (findOne)
            const existing = await Dni.findOne({ userId, guildId });
            
            if (existing) {
                return await safeReply(interaction, { content: '❌ Ya tienes un DNI registrado en este servidor.' });
            }

            const dniNumber = Math.floor(10000000 + Math.random() * 90000000).toString();

            // CAMBIO 3: Crear documento estilo MongoDB (new Dni + save)
            const newDni = new Dni({
                userId,
                guildId,
                dni: dniNumber,
                nombre,
                apellido,
                edad,
                nacionalidad,
                psid
            });
            
            await newDni.save();

            await safeReply(interaction, { content: `✅ Tu DNI ha sido creado correctamente.\n🆔 DNI: **${dniNumber}**` });

        } catch (err) {
            console.error('❌ ERROR al crear DNI:', err);
            await safeReply(interaction, { content: '❌ Ocurrió un error al crear tu DNI.' });
        }
}

export default { data, execute };