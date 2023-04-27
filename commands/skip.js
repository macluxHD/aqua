const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');

// helper functions
const reply = require('../utils/reply');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip to the next song!'),
    async execute(client, interaction, message) {
        const guild = !interaction ? message.guild : interaction.guild;

        if (!getVoiceConnection(guild.id)?._state?.subscription?.player?.stop()) {
            await reply(interaction, message?.channel, 'No song is playing!');
            return;
        }

        reply(interaction, message?.channel, 'Skipped to the next song!');
    },
};