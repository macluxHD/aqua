const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');
const utils = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops Song Playback and disconnects from Channel!'),
    async execute(client, interaction, db, message) {
        const guild = !interaction ? message.guild : interaction.guild;

        const connection = getVoiceConnection(guild.id);

        if (!connection) return;
        connection.disconnect();

        if (!db.get(`server.${guild.id}.conf.retainQueue`)) {
            db.set(`server.${guild.id}.music.queue`, []);
        }

        utils.reply(interaction, message?.channel, 'Stopped Playback!');
    },
};