const { SlashCommandBuilder } = require('@discordjs/builders');
const { createAudioPlayer, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
const ytdl = require('discord-ytdl-core');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play indicated song!')
        .addStringOption(option =>
            option.setName('link')
                .setDescription('Youtube Link of the song you want to play')
                .setRequired(true)),
    async execute(interaction) {

        // check if the link is a youtube link
        const regex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/;
        const link = interaction.options.getString('link');

        if (!regex.test(link)) {
            await interaction.reply('Invalid link!');
            return;
        }

        // TODO: Get data / update embed etc..

        const player = createAudioPlayer();
        const resource = createAudioResource(ytdl(link, { filter: 'audioonly', opusEncoded: true }), { inlineVolume: true });
        resource.volume.setVolume(0.3);

        player.play(resource);

        // join voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            await interaction.reply('You need to be in a voice channel to use this command!');
            return;
        }
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        connection.subscribe(player);
        await interaction.reply('Playing!');
    },
};