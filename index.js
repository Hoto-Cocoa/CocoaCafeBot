const TelegramBot = require('node-telegram-bot-api');
const Logger = require('winston');
const Config = require('./config');
const WebSocket = require('ws');
const Database = require('./modules/Database');

const logger = Logger.createLogger({ format: Logger.format.combine(Logger.format.splat(), Logger.format.simple(), Logger.format.timestamp(), Logger.format.printf(info => { return `[${info.timestamp}] [${info.level}] ${info.message}`; })), levels: Logger.config.syslog.levels, transports: [ new Logger.transports.Console({ level: 'debug' }), new Logger.transports.File({ filename: 'debug.log', level: 'debug' })]});
const telegramBot = new TelegramBot(Config.Telegram.Token, { polling: true });
const server = new WebSocket.Server({ port: Config.Server.Port });
const database = new Database(Config.Database, logger);

require('./modules/CreateDatabase')(Config.Database, logger);

server.broadcast = data => { server.clients.forEach(client => client.readyState === WebSocket.OPEN && client.authorized && client.send(data)); }

server.on('connection', client => {
	client.on('message', msg => {
		msg = JSON.parse(msg);
		switch(msg.type) {
			case 'authorize': return database.query('SELECT id FROM tokens WHERE value=? and active=1;', msg.data.value).then(({ length }) => length ? (client.authorized = true) && client.send(JSON.stringify({ type: 'authorizeResult', value: { success: true }})) : client.send(JSON.stringify({ type: 'authorizeResult', value: { success: false, type: 'InvalidToken' }})));
			case 'sendMessage': return client.authorized ? telegramBot.sendMessage(Config.Telegram.ChatId, msg.data.value, msg.data.options).then(r => (delete r.chat && delete r.from && r.reply_to_message && delete r.reply_to_message.chat && delete r.reply_to_message.from) & client.send(JSON.stringify({ type: 'sendMessageResult', value: { success: true, value: r }}))).catch(e => client.send(JSON.stringify({ type: 'sendMessageResult', value: { success: false, value: e }}))) : client.send(JSON.stringify({ type: 'sendMessageResult', value: { success: false, type: 'AuthorizeNeeded' }}));
			default: return client.send(JSON.stringify({ type: 'result', value: { success: false, type: 'InvalidType' }}));
		}
	});
});

telegramBot.on('message', msg => {
	if(msg.chat.id === msg.from.id) switch(msg.text) {
		case 'register': return database.query('SELECT id FROM tokens WHERE userId=? and active=1;', msg.from.id).then(({ length }) => length ? telegramBot.sendMessage(msg.chat.id, 'You already registered!', { reply_to_message_id: msg.message_id }) : database.query('INSERT INTO tokens(date, userId, value) VALUES(?, ?, ?);', [ Date.now(), msg.from.id, token = Math.random().toString(32).substring(5) ]).then(() => telegramBot.sendMessage(msg.chat.id, token, { reply_to_message_id: msg.message_id })));
		case 'unregister': return database.query('SELECT id FROM tokens WHERE userId=? and active=1;', msg.from.id).then(r => r.length ? (database.query('UPDATE tokens SET active=0 WHERE id=?;', r[0].id) && telegramBot.sendMessage(msg.chat.id, 'Done!', { reply_to_message_id: msg.message_id })) : telegramBot.sendMessage(msg.chat.id, 'You are not registered!', { reply_to_message_id: msg.message_id }));
	}
	return (msg.chat.id === Config.Telegram.ChatId) && (delete msg.chat && msg.reply_to_message && delete msg.reply_to_message.chat) & server.broadcast(JSON.stringify({ type: 'message', value: msg }));
});

telegramBot.on('callback_query', msg => (msg.chat.id === Config.Telegram.ChatId) && (delete msg.chat && msg.reply_to_message && delete msg.reply_to_message.chat) & server.broadcast(JSON.stringify({ type: 'callback_query', value: msg })));
telegramBot.on('edited_message', msg => (msg.chat.id === Config.Telegram.ChatId) && (delete msg.chat && msg.reply_to_message && delete msg.reply_to_message.chat) & server.broadcast(JSON.stringify({ type: 'edited_message', value: msg })));
telegramBot.on('polling_error', e => logger.log('error', e.stack));
