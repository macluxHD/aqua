const { SlashCommandBuilder } = require('@discordjs/builders');
const utils = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with the latency!'),
    async execute(client, interaction, db, message) {
        utils.reply(interaction, message?.channel, `Pong! Latency is ${client.ws.ping}ms.`);
    },
};