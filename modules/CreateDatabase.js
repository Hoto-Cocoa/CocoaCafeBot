const Sequelize = require('sequelize');

module.exports = (config, logger) => {
	const sequelize = new Sequelize(config.database, config.user, config.password, {
		dialect: 'mysql',
		pool: {
			max: 30,
			min: 0,
			acquire: 30000,
			idle: 10000
		},
		logging: sequelizeLogger
	});
	const queryInterface = sequelize.getQueryInterface();

	queryInterface.createTable('tokens', {
		id: {
			type: Sequelize.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		date: {
			type: Sequelize.BIGINT,
			allowNull: false
		},
		userId:  {
			type: Sequelize.BIGINT,
			allowNull: false
		},
		value: {
			type: Sequelize.TEXT,
			allowNull: false
		},
		active: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: true
		}
	});
	
	function sequelizeLogger(msg) {
		logger.log('debug', 'Sequelize Executed "%s"', msg);
	}
}
