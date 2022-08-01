const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');
const utils = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip to the next song!'),
    async execute(client, interaction, db, message, args) {
        const guild = !interaction ? message.guild : interaction.guild;

        if (!getVoiceConnection(guild.id)?._state?.subscription?.player?.stop()) {
            await utils.reply(interaction, message?.channel, 'No song is playing!');
            return;
        }

        utils.reply(interaction, message?.channel, 'Skipped to the next song!');
    },
};