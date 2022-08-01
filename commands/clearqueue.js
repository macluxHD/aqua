const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');
const utils = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearqueue')
        .setDescription('Clear the Music Queue!'),
    async execute(client, interaction, db, message) {
        const guild = !interaction ? message.guild : interaction.guild;

        if (!getVoiceConnection(guild.id)?._state?.subscription?.player) {
            db.set(`server.${guild.id}.music.queue`, []);
        }
        else {
            const queue = db.get(`server.${guild.id}.music.queue`);
            db.set(`server.${guild.id}.music.queue`, queue.slice(0, 1));
        }

        utils.refreshMusicEmbed(db, guild);
        utils.reply(interaction, message?.channel, 'Cleared the Music Queue!');
    },
};