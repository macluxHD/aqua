const { SlashCommandBuilder } = require('@discordjs/builders');
const utils = require('../utils');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggle Loop for Music Queue!'),
    async execute(client, interaction, message) {
        const guild = !interaction ? message.guild : interaction.guild;

        const loop = await prisma.guild.findUnique({ where: { id: guild.id } }).then(dbGuild => dbGuild.loop);
        await prisma.guild.update({ where: { id: guild.id }, data: { loop: !loop } });

        utils.refreshMusicEmbed(guild);
        utils.reply(interaction, message?.channel, `Loop is now ${!loop ? 'enabled' : 'disabled'}!`);
    },
};