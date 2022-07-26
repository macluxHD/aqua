const musicCommands = ['play', 'page', 'skip', 'loop', 'clearqueue', 'stop', 'pause'];
const ytRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/;

module.exports = async (utils, client, interaction, db, message) => {
    const isSlashCommand = interaction !== null;

    const guild = isSlashCommand ? interaction.guild : message.guild;
    const channel = isSlashCommand ? interaction.channel : message.channel;
    const prefix = db.get(`server.${guild.id}.conf.prefix`);

    let command;

    if (isSlashCommand) command = interaction.commandName;
    else command = message.content.trim().split(/ +/g)[0];

    const isMusicChannel = channel.id == db.get(`server.${guild.id}.conf.musicChannel`);

    if (((!isSlashCommand && command.startsWith(prefix)) || isSlashCommand) && musicCommands.includes(command) && !isMusicChannel) {
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
            utils.refreshMusicEmbed(db, guild);
            return true;
        }

        if (musicCommands.includes(command) || musicCommands.includes(command.substring(prefix.length))) {
            if (command.startsWith(prefix)) command = command.substring(prefix.length);
            try {
                client.commands.get(command).execute(client, interaction, db, message, message?.content?.split(/ +/g));
            }
            catch (error) {
                console.error(error);
                await utils.reply(null, message.channel, 'An error occurred while executing that command!');
            }
            utils.refreshMusicEmbed(db, guild);
            return true;
        }
    }

    return false;
};