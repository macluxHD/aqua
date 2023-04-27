const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');

// helper functions
const reply = require('../utils/reply');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pauses/Resumes Playback!'),
    async execute(client, interaction, message) {
        const guild = !interaction ? message.guild : interaction.guild;
        const player = getVoiceConnection(guild.id)?._state?.subscription?.player;

        if (!player) {
            await reply(interaction, message?.channel, 'No song is playing!');
            return;
        }

        if (player.pause()) {
            await reply(interaction, message?.channel, 'Paused Playback!');
        }
        else {
            player.unpause();
            await reply(interaction, message?.channel, 'Resumed Playback!');
        }
    },
};