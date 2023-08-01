const { SlashCommandBuilder } = require('@discordjs/builders');

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
                .setRequired(true)
                .addChoices(
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

        const day = !interaction ? args[1] : interaction.options.get('day').value;

        if (day < 0 || day > 6 || isNaN(day)) {
            reply(interaction, message?.channel, 'Invalid day!');
            return;
        }

        aniNotif.notify(client, day);
    },
};