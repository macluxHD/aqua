const { SlashCommandBuilder } = require('@discordjs/builders');
const utils = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggle Loop for Music Queue!'),
    async execute(client, interaction, db, message) {
        const guild = !interaction ? message.guild : interaction.guild;

        const loop = db.get(`server.${guild.id}.music.loop`);
        db.set(`server.${guild.id}.music.loop`, !loop);

        utils.reply(interaction, message?.channel, `Loop is now ${!loop ? 'enabled' : 'disabled'}!`);
    },
};