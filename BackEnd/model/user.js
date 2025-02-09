var db = require('./databaseConfig.js');
var config = require('../config.js');
var jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt")

// else {
// 	var token = "";

// 	if (result.length == 1) {
// 		token = jwt.sign({ id: result[0].id }, config.key, {
// 			expiresIn: 86400 //expires in 24 hrs
// 		});
// 		console.log("@@token " + token);
// 		return callback(null, token, result);
// 	} //if(res)
// 	else {
// 		console.log("email/password does not match");
// 		var err2 = new Error("Email/Password does not match.");
// 		err2.statusCode = 404;
// 		console.log(err2);
// 		return callback(err2, null, null);
// 	}
// }  //else


var userDB = {

	loginUser: function (email, password, callback) {

		var conn = db.getConnection();

		conn.connect(function (err) {
			if (err) {
				console.log(err);
				return callback(err, null);
			}
			else {
				console.log("Connected!");

				var sql = 'select * from users where email = ?';
				conn.query(sql, [email], function (err, result) {
					conn.end();

					if (err) {
						console.log("Err: " + err);
						return callback(err, null, null);

					} 
					if (result.length === 0) {
						console.log("Email not found");
						var err2 = new Error("Email/Password does not match.");
						err2.statusCode = 404;
						return callback(err2, null, null);
					}	
					console.log(result[0].password)
					const storedHashedPassword = result[0].password;
					bcrypt.compare(password, storedHashedPassword, function (err, isMatch) {
						console.log(password)
						if (err) {
							console.log("Bcrypt error:", err);
							return callback(err, null, null);
						}

						if (!isMatch) {
							console.log("Invalid password");
							var err2 = new Error("Email/Password does not match.");
							err2.statusCode = 404;
							return callback(err2, null, null);
						}

						// 3️⃣ Password is correct → Generate JWT token
						var token = jwt.sign(
							{ id: result[0].id }, // Only include user ID
							config.key,
							{ expiresIn: 86400 } // 24 hours
						);

						console.log("@@token " + token);
						return callback(null, token, result);
					});
				});
			}
		});
	},

	updateUser: function (username, firstname, lastname, id, callback) {

		var conn = db.getConnection();
		conn.connect(function (err) {
			if (err) {
				console.log(err);
				return callback(err, null);
			} else {
				console.log("Connected!");

				var sql = "update users set username = ?,firstname = ?,lastname = ? where id = ?;";

				conn.query(sql, [username, firstname, lastname, id], function (err, result) {
					conn.end();

					if (err) {
						console.log(err);
						return callback(err, null);
					} else {
						console.log("No. of records updated successfully: " + result.affectedRows);
						return callback(null, result.affectedRows);
					}
				})
			}
		})
	},

	addUser: function (username, email, password, firstname, lastname, callback) {

		var conn = db.getConnection();

		conn.connect(function (err) {
			if (err) {
				console.log(err);
				return callback(err, null);
			} else {


				console.log("Connected!");
				var sql = "Insert into users(username,email,password,firstname,lastname) values(?,?,?,?,?)";
				conn.query(sql, [username, email, password, firstname, lastname], function (err, result) {
					conn.end();

					if (err) {
						console.log(err);
						return callback(err, null);
					} else {
						return callback(null, result);
					}
				});

			}
		});
	},
};


module.exports = userDB;