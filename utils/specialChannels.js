const musicCommands = ['play'];
const ytRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/;

module.exports = (utils, client, interaction, db, message) => {
    const isSlashCommand = interaction !== null;

    const guild = isSlashCommand ? interaction.guild : message.guild;
    const channel = isSlashCommand ? interaction.channel : message.channel;

    let command;

    if (isSlashCommand) command = interaction.commandName;
    else command = message.content.trim().split(/ +/g)[0];

    const isMusicChannel = channel.id == db.get(`server.${guild.id}.conf.musicChannel`);

    if (((!isSlashCommand && command.startsWith(db.get(`server.${guild.id}.conf.prefix`))) || isSlashCommand) && musicCommands.includes(command) && !isMusicChannel) {
        await utils.reply(interaction, channel, 'This command cannot be used here!');
        return true;
    }

    if (isMusicChannel) {
        if (!isSlashCommand) {
            setTimeout(() => {
                if (!message.pinned) {
                    try {
                        message.delete();
                    }
                    catch (e) {
                        // console.log(e);
                    }
                }
            }, 5000);
        }

        if (ytRegex.test(command)) {
            try {
                client.commands.get('play').execute(client, interaction, db, message, ['play', command]);
            }
            catch (error) {
                console.error(error);
                await utils.reply(null, message.channel, 'An error occurred while executing that command!');
            }
            return true;
        }

        if (musicCommands.includes(command)) {
            try {
                client.commands.get(command).execute(client, interaction, db, message, message?.content?.split(/ +/g));
            }
            catch (error) {
                console.error(error);
                await utils.reply(null, message.channel, 'An error occurred while executing that command!');
            }
            return true;
        }
    }

    return false;
};