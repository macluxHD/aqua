// register commands
// require('./deploy-commands');

// Import environment variables
require('dotenv').config();

// Require the necessary discord.js classes
const { Client, Collection } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');
const utils = require('./utils');

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
    },
};

// Generate global config if it doesn't exist
if (!db.has('config')) {
    db.set('config', {
        'maxQueueLength': 50,
    });
}

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Ready!');
});

client.on('messageCreate', async message => {
    const guildId = message.guild.id;

    if (!db.has(`server.${guildId}`)) {
        db.set(`server.${guildId}`, defaultServerData);
    }
    if (utils.specialChannels(utils, client, null, db, message)) return;

    const prefix = db.get(`server.${guildId}.conf.prefix`);

    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).split(/ +/);

    const command = client.commands.get(args[0]);

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

    if (utils.specialChannels(utils, client, interaction, db)) return;
    try {
        await command.execute(client, interaction, db);
    }
    catch (error) {
        console.error(error);
        await interaction.reply({ content: 'An error occurred while executing that command!', ephemeral: true });
    }
});


// Login to Discord with your client's token
client.login(process.env.TOKEN);