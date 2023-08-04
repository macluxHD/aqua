const { SlashCommandBuilder } = require('@discordjs/builders');
const moment = require('moment');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// helper functions
const aniNotif = require('../Services/AnimeNotifier');
const reply = require('../utils/reply');

// command with day of the week as argument
module.exports = {
    data: new SlashCommandBuilder()
        .setName('notify')
        .setDescription('Replies with the latency!')
        .addStringOption(option =>
            option.setName('day')
                .setDescription('Day of the week')
                .setRequired(false)
                .addChoices(
                    { name: 'Today', value: 'undefined' },
                    { name: 'Sunday', value: '0' },
                    { name: 'Monday', value: '1' },
                    { name: 'Tuesday', value: '2' },
                    { name: 'Wednesday', value: '3' },
                    { name: 'Thursday', value: '4' },
                    { name: 'Friday', value: '5' },
                    { name: 'Saturday', value: '6' },
                )),
    async execute(client, interaction, message, args) {
        reply(interaction, message?.channel, 'Notifying...');

        let day = !interaction ? args[1] : interaction.options.get('day')?.value;

        if (isNaN(day)) {
            day = moment().day();
        }
        else if (day < 0 || day > 6) {
            reply(interaction, message?.channel, 'Invalid day!');
            return;
        }

        const guildId = !interaction ? message?.guild.id : interaction.guildId;
        const guild = await prisma.guild.findUnique({ where: { id: guildId } });

        aniNotif.notify(client, day, guild);
    },
};