const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test various things!'),
    async execute(interaction) {
        await interaction.reply('Success!');
    },
};