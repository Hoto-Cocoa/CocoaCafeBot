(ws = (new (require('ws'))(`ws://127.0.0.1:${require('../config').Server.Port}/`))).on('open', () => {
	ws.send(JSON.stringify({
		type: 'authorize',
		data: { value: require('../config').Test.Token }
	}));
}).on('message', data => {
	data = JSON.parse(data);
	console.log(data);
	if(data.value.text === 'ping!') ws.send(JSON.stringify({ type: 'sendMessage', data: { value: 'pong!', options: { reply_to_message_id: data.value.message_id }}}));
	if(data.value.text === 'info!') ws.send(JSON.stringify({ type: 'sendMessage', data: { value: JSON.stringify(data.value), options: { reply_to_message_id: data.value.message_id }}}));
});
