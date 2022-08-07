const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');
const utils = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pauses/Resumes Playback!'),
    async execute(client, interaction, db, message) {
        const guild = !interaction ? message.guild : interaction.guild;
        const player = getVoiceConnection(guild.id)?._state?.subscription?.player;

        if (!player) {
            await utils.reply(interaction, message?.channel, 'No song is playing!');
            return;
        }

        if (player.pause()) {
            await utils.reply(interaction, message?.channel, 'Paused Playback!');
        }
        else {
            player.unpause();
            await utils.reply(interaction, message?.channel, 'Resumed Playback!');
        }
    },
};