const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');
const utils = require('../utils');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearqueue')
        .setDescription('Clear the Music Queue!'),
    async execute(client, interaction, message) {
        const guild = !interaction ? message.guild : interaction.guild;

        if (!getVoiceConnection(guild.id)?._state?.subscription?.player) {
            await prisma.queue.deleteMany({ where: { guildId: guild.id } });
        }
        else {
            const queue = await prisma.queue.findMany({ where: { guildId: guild.id } });
            await prisma.queue.deleteMany({ where: { guildId: guild.id, NOT: { id: queue[0].id } } });
        }

        utils.reply(interaction, message?.channel, 'Cleared the Music Queue!');
    },
};