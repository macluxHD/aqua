const musicCommands = ['play'];
const ytRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/;

module.exports = (utils, client, interaction, db, message) => {
    const isSlashCommand = interaction !== null;

    const guild = isSlashCommand ? interaction.guild : message.guild;
    const channel = isSlashCommand ? interaction.channel : message.channel;

    let command;

    if (isSlashCommand) command = interaction.command;
    else command = message.content.trim().split(/ +/g)[0];

    const isMusicChannel = channel.id == db.get(`server.${guild.id}.conf.musicChannel`);

    if (command.startsWith(db.get(`server.${guild.id}.conf.prefix`)) && musicCommands.includes(command) && !isMusicChannel) {
        utils.reply(interaction, channel, 'This command cannot be used here!');
        return true;
    }

    if (isMusicChannel) {
        if (!isSlashCommand) {
            setTimeout(() => {
                if (!message.pinned) message.delete();
            }, 5000);
        }

        if (ytRegex.test(command)) {
            client.commands.get('play').execute(null, db, message, ['play', command]);
            return true;
        }

        if (musicCommands.includes(command)) {
            client.commands.get(command).execute(null, db, message, message.content.split(/ +/g));
            return true;
        }
    }

    return false;
};