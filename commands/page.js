const { SlashCommandBuilder } = require('discord.js');
const utils = require('../utils');

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
                    { name: 'Previous  Page', value : 'previous' })),
    execute(client, interaction, db, message, args) {
        const guild = !interaction ? message.guild : interaction.guild;

        let queueIndex = db.get(`server.${guild.id}.music.queueIndex`);
        const action = !interaction ? args[1] : interaction.options.get('action').value;

        if (action === 'next') {
            queueIndex++;
        }
        else if (action === 'previous') {
            queueIndex--;
        }

        db.set(`server.${guild.id}.music.queueIndex`, queueIndex);
        utils.refreshMusicEmbed(db, interaction === null ? message.guild : interaction.guild);
        utils.reply(interaction, message?.channel, `Flipped to page ${queueIndex + 1}!`);
    },
};