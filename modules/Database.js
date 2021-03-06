const mysql = require('mysql2');

module.exports = class Database {
	constructor(config, logger) {
		this.connection = mysql.createConnection(Object.assign(config, { supportBigNumbers: true, bigNumberStrings: true }));
		this.connection.connect(e => {
			if(e) {
				logger.log('error', e);
				throw e;
			}
			logger.log('notice', 'Connected to Database(#%s)', this.connection.threadId);
		});
		this.connection.on('error', e => logger.log('error', e));
		setInterval(() => this.connection.query('SELECT 1 LIMIT 1;'), 300);
	}
	query(sql, args) {
		return new Promise((resolve, reject) => this.connection.query(sql, args, (e, r) => e ? reject(e) : sql.startsWith('SELECT') ? resolve(r.length ? r.length === 1 ? Object.keys(r[0]).length === 1 ? r[0][Object.keys(r[0])[0]] : r[0] : r : false) : resolve(r)));
	}
	close() {
		return new Promise((resolve, reject) => this.connection.end(e => e ? reject(e) : resolve()));
	}
}
