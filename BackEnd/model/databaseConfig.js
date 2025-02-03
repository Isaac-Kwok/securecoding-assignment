

var mysql = require('mysql2');

var dbconnect = {
getConnection: function() {
    var conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "subeteoshiete4@",
    database: "snapsell"
});
return conn;
}
};

module.exports = dbconnect