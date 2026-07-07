const config = require('../config');
const db = require('../db/queries');
const logger = require('./logger');
const { messages } = require('./messages');

let adminCache = null;
let adminCacheAt = 0;
const ADMIN_CACHE_MS = 60_000;

function invalidateAdminCache() {
  adminCache = null;
  adminCacheAt = 0;
}

function resolveApplicationOwnerId(client) {
  const owner = client?.application?.owner;
  if (!owner) return null;
  if (typeof owner === 'string') return owner;
  return owner.id ?? null;
}

function isOwner(interaction) {
  const userId = interaction?.user?.id;
  if (!userId) return false;

  if (config.discord.ownerUserIds.includes(userId)) {
    return true;
  }

  const appOwnerId = resolveApplicationOwnerId(interaction.client);
  return appOwnerId === userId;
}

function hasAdminRole(member) {
  if (!member?.roles?.cache) return false;
  return config.discord.adminRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

async function isBotAdminInDatabase(userId) {
  const now = Date.now();
  if (!adminCache || now - adminCacheAt > ADMIN_CACHE_MS) {
    const rows = await db.listBotAdmins();
    adminCache = new Set(rows.map((row) => row.discord_user_id));
    adminCacheAt = now;
  }
  return adminCache.has(userId);
}

async function isBotAdmin(interaction) {
  const userId = interaction?.user?.id;
  if (!userId) return false;

  if (isOwner(interaction)) return true;
  if (hasAdminRole(interaction.member)) return true;

  try {
    return await isBotAdminInDatabase(userId);
  } catch (error) {
    logger.error('Eroare verificare bot_admins', { userId, error: error.message });
    return false;
  }
}

async function denyInteraction(interaction, content) {
  const payload = { content };

  if (interaction.deferred && !interaction.replied) {
    await interaction.editReply(payload);
    return;
  }

  if (interaction.replied) {
    await interaction.followUp({ ...payload, ephemeral: true });
    return;
  }

  await interaction.reply({ ...payload, ephemeral: true });
}

async function requireOwner(interaction) {
  if (isOwner(interaction)) return true;

  logger.warn('Acces owner refuzat', {
    command: interaction.commandName,
    userId: interaction.user.id,
    username: interaction.user.username,
  });

  await denyInteraction(interaction, messages.permissions.noOwner);
  return false;
}

async function requireAdmin(interaction) {
  if (await isBotAdmin(interaction)) return true;

  logger.warn('Acces admin refuzat', {
    command: interaction.commandName,
    userId: interaction.user.id,
    username: interaction.user.username,
  });

  await denyInteraction(interaction, messages.permissions.noAdmin);
  return false;
}

module.exports = {
  isOwner,
  isBotAdmin,
  requireOwner,
  requireAdmin,
  invalidateAdminCache,
  hasAdminRole,
};
