const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(config.discord.token);

async function deploy() {
  try {
    logger.info(`Înregistrez ${commands.length} comenzi slash...`);

    if (config.discord.guildId) {
      // Sync rapid pe un singur server (recomandat la dezvoltare)
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      logger.info('Comenzi înregistrate pe server (guild commands)');
    } else {
      // Global — poate dura până la 1 oră să apară
      await rest.put(Routes.applicationCommands(config.discord.clientId), { body: commands });
      logger.info('Comenzi înregistrate global');
    }
  } catch (error) {
    logger.error('Eroare deploy comenzi', { error: error.message });
    process.exit(1);
  }
}

deploy();
