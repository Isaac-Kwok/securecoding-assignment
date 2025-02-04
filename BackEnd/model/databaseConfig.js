require('dotenv').config();
var mysql = require('mysql2');

// Validate required environment variables
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    throw new Error('Missing required environment variables for database connection.');
}

var dbconnect = {
    getConnection: function () {
        var conn = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        return conn;
    }
};

module.exports = dbconnect;