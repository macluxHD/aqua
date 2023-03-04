const { SlashCommandBuilder } = require('discord.js');
const utils = require('../utils');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('page')
        .setDescription('Flip queue Pages!')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Either flip to next or previous page')
                .setRequired(true)
                .addChoices(
                    { name: 'Next Page', value: 'next' },
                    { name: 'Previous  Page', value: 'previous' })),
    async execute(client, interaction, message, args) {
        const guild = !interaction ? message.guild : interaction.guild;

        let queueIndex = await prisma.guild.findUnique({ where: { id: guild.id } }).then(dbGuild => dbGuild.queueIndex);
        const action = !interaction ? args[1] : interaction.options.get('action').value;

        if (action === 'next') {
            queueIndex++;
        }
        else if (action === 'previous') {
            queueIndex--;
        }
        else {
            return;
        }

        await prisma.guild.update({
            where: {
                id: guild.id,
            },
            data: {
                queueIndex: queueIndex,
            },
        });
        utils.reply(interaction, message?.channel, 'Flipped page!');
    },
};