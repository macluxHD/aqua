module.exports = (interaction, channel, message) => {
    return new Promise(async (resolve) => {
        if (interaction === null) {
            channel.send(message);
            resolve();
        }
        else {
            if (!interaction.replied) {
                await interaction.reply(message);
            }
            else {
                await interaction.followUp(message);
            }
            resolve();
        }
    });
};