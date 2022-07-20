const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with the latency!'),
    async execute(interaction) {
        await interaction.reply(`Pong! Latency is ${interaction.client.ws.ping}ms.`);
    },
};