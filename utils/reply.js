/**
 * Generic reply function for both slash commands and normal messages
 * @param {any} interaction
 * @param {any} channel
 * @param {any} message
 * @returns {any}
 */
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