module.exports = (interaction, channel, message) => {
    if (interaction === null) {
        channel.send(message);
    }
    else {
        interaction.reply(message);
    }
};