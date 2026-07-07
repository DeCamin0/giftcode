const fs = require('fs');
const path = require('path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const { testConnection } = require('./db/pool');
const { ensureSchema } = require('./db/schema');
const { startGiftCodeScheduler } = require('./services/giftCodeScheduler');
const { handleAutoRegisterMessage } = require('./handlers/autoRegister');
const logger = require('./utils/logger');
const { messages } = require('./utils/messages');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
    logger.debug(`Comandă încărcată: /${command.data.name}`);
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  try {
    await readyClient.application.fetch();
    logger.info('Discord application metadata încărcată');
  } catch (error) {
    logger.warn('Nu s-a putut încărca application owner', { error: error.message });
  }

  logger.info(`Bot conectat ca ${readyClient.user.tag}`);
  if (config.discord.autoRegisterEnabled) {
    logger.info(
      config.discord.registerChannelId
        ? `Auto-register activ în canalul ${config.discord.registerChannelId}`
        : 'Auto-register activ în orice canal (mesaj = doar cifre)'
    );
  }
  startGiftCodeScheduler(client);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    await handleAutoRegisterMessage(message);
  } catch (error) {
    logger.error('Eroare auto-register', { error: error.message });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Eroare la /${interaction.commandName}`, { error: error.message });

    const payload = { content: messages.genericError };

    try {
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply(payload);
      } else if (interaction.replied) {
        await interaction.followUp({ ...payload, ephemeral: true });
      } else {
        await interaction.reply({ ...payload, ephemeral: true });
      }
    } catch (replyError) {
      logger.error('Nu s-a putut trimite răspuns eroare Discord', {
        command: interaction.commandName,
        error: replyError.message,
      });
    }
  }
});

async function main() {
  try {
    await testConnection();
    await ensureSchema();
    await client.login(config.discord.token);
  } catch (error) {
    logger.error('Bot nu a putut porni', { error: error.message });
    process.exit(1);
  }
}

main();
