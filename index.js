// register commands
// require('./deploy-commands');

// Import environment variables
require('dotenv').config();

// Require the necessary discord.js classes
const { Client, Collection } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

// Create a new client instance
const client = new Client({ intents: ['Guilds', 'GuildVoiceStates'] });

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

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
    if (interaction.commandType !== 1) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    }
    catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});


// Login to Discord with your client's token
client.login(process.env.token);