import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Dni } from '@database/mongodb'; // Importamos el modelo

const command = {
    data: new SlashCommandBuilder()
        .setName('dni')
        .setDescription('Muestra tu DNI o el de otro usuario')
        .addUserOption(option => 
            option.setName('usuario')
                  .setDescription('Usuario a consultar')
        ),

    async execute(interaction) {
        const user = interaction.options.getMember('usuario') || interaction.user;
        const userId = user.id;

        try {
            // Buscamos el documento en MongoDB
            const data = await Dni.findOne({ userId, guildId: interaction.guild.id });
            
            if (!data) {
                return await interaction.reply({ 
                    content: `❌ ${user.user ? user.user.tag : user.tag} no tiene DNI registrado en este servidor.`,
                    ephemeral: false 
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('🪪 ┃ Documento Nacional')
                .setColor('#3498DB')
                .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }))
                .addFields(
                    { name: '🔢 Nº Dni:', value: data.dni || 'No Registrado', inline: false },
                    { name: '🪪 Nombre:', value: data.nombre || 'No Registrado', inline: true },
                    { name: '🪪 Apellido:', value: data.apellido || 'No Registrado', inline: true },
                    { name: '🎂 Edad:', value: data.edad?.toString() || 'No Registrado', inline: true },
                    { name: '🌍 Nacionalidad:', value: data.nacionalidad || 'No Registrado', inline: true },
                    { name: '🎮 ID de PlayStation:', value: data.psid || 'No Registrado', inline: false }
                )
                .setFooter({ text: `Usuario: ${user.user ? user.user.tag : user.tag}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (err) {
            console.error('❌ ERROR al consultar DNI:', err);
            await interaction.reply({ 
                content: '❌ Ocurrió un error al consultar el DNI.', 
                ephemeral: false 
            });
        }
    }
};

export default command;