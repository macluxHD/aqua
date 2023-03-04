// register commands
// require('./deploy-commands');

// Import environment variables
require('dotenv').config();

// Require the necessary discord.js classes
const { Client, Collection } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

const fs = require('node:fs');
const path = require('node:path');
const utils = require('./utils');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new client instance
const client = new Client({ intents: ['Guilds', 'GuildVoiceStates', 'GuildMessages', 'MessageContent'] });

// Create a new collection to hold the commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection
    // With the key as the command name and the value as the exported module
    client.commands.set(command.data.name, command);
}

const croxy = require('croxydb');

const db = new croxy({
    'dbName': 'db',
    'dbFolder': './database',
    'readable': true,
});

const defaultServerData = {
    music: {
        queue: [],
        loop: false,
        queueIndex: 0,
        queueEmbedId: null,
        playerEmbedId: null,
    },
    conf: {
        prefix: '!',
        musicChannel: null,
        retainQueue: false,
    },
};

// When the client is ready, run this code (only once)
client.once('ready', async () => {
    console.log('Ready!');

    // Check if Database is up to date (could not be due to restarts / crashes)
    const guilds = client.guilds.cache.map(guild => guild.id);
    const dbGuilds = (await prisma.guild.findMany()).map(guild => guild.id);

    const guildsToDelete = dbGuilds.filter(guild => !guilds.includes(guild));
    const guildsToAdd = guilds.filter(guild => !dbGuilds.includes(guild));

    for (const guild of guildsToAdd) {
        console.log(`Adding guild ${guild} to database`);
        await prisma.guild.create({
            data: {
                id: guild,
            },
        });
    }

    for (const guild of guildsToDelete) {
        console.log(`Deleting guild ${guild} from database`);
        await prisma.guild.delete({
            where: {
                id: guild,
            },
        });
    }
});

client.on('guildCreate', guild => {
    console.log(`Adding guild ${guild} to database`);
    prisma.guild.create({
        data: {
            id: guild.id,
        },
    });
});

client.on('guildDelete', guild => {
    console.log(`Deleting guild ${guild} from database`);
    prisma.guild.delete({
        where: {
            id: guild.id,
        },
    });
});

client.on('messageCreate', async message => {
    const guildId = message.guild.id;

    if (!db.has(`server.${guildId}`)) {
        db.set(`server.${guildId}`, defaultServerData);
    }

    if (await utils.specialChannels(utils, client, null, db, message)) return;

    const prefix = db.get(`server.${guildId}.conf.prefix`);

    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).split(/ +/);

    const command = client.commands.get(args[0]);
    if (typeof (command) === 'undefined') return;

    try {
        command.execute(client, null, db, message, args);
    }
    catch (error) {
        console.error(error);
        await utils.reply(null, message.channel, 'An error occurred while executing that command!');
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.commandType !== 1) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;
    const guildId = interaction.guildId;

    if (!db.has(`server.${guildId}`)) {
        db.set(`server.${guildId}`, defaultServerData);
    }

    if (await utils.specialChannels(utils, client, interaction, db)) return;
    try {
        await command.execute(client, interaction, db);
    }
    catch (error) {
        console.error(error);
        await interaction.reply({ content: 'An error occurred while executing that command!', ephemeral: true });
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    const guild = newState.guild;

    // Disconnect when noone in Channel anymore
    if (newState.channelId == null && oldState.channelId != null) {
        const channel = guild.channels.cache.get(oldState.channelId);

        if (channel.members.size == 1) {
            const connection = getVoiceConnection(guild.id);

            if (!connection) return;
            connection.disconnect();

            if (!db.get(`server.${guild.id}.conf.retainQueue`)) {
                db.set(`server.${guild.id}.music.queue`, []);
            }
            utils.refreshMusicEmbed(db, guild);
        }
    }
});


// Login to Discord with your client's token
client.login(process.env.TOKEN);