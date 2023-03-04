const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');
const utils = require('../utils');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops Song Playback and disconnects from Channel!'),
    async execute(client, interaction, message) {
        const guild = !interaction ? message.guild : interaction.guild;

        const connection = getVoiceConnection(guild.id);

        if (!connection) return;
        connection.disconnect();

        const dbGuild = await prisma.guild.findUnique({ where: { id: guild.id } });
        if (!dbGuild.retainQueue) {
            await prisma.queue.deleteMany({
                where: {
                    guildId: guild.id,
                },
            });
        }

        utils.reply(interaction, message?.channel, 'Stopped Playback!');
    },
};