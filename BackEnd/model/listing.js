

var db = require('./databaseConfig.js');

var listingDB = {
    addListing: function (title, category, description, price, fk_poster_id, callback) {
        console.log(description);
        var conn = db.getConnection();

        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return callback(err, null);
            }
            else {
                var sql = 'insert into listings(title,category,description,price,fk_poster_id) values(?,?,?,?,?)';
                conn.query(sql, [title, category, description, price, fk_poster_id], function (err, result) {
                    conn.end();
                    if (err) {
                        console.log("Err: " + err);
                        return callback(err, null);
                    } else {
                        return callback(null, result)
                    }
                })

            }
        })
    },
    getUserListings: function (userid, callback) {
        var conn = db.getConnection();
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return callback(err, null);
            } else {
                var sql = `select l.title,l.category,l.price,l.id,i.name from listings l,images i where l.id = i.fk_product_id and fk_poster_id = ?`;
                conn.query(sql, [userid], function (err, result) {
                    conn.end()
                    if (err) {
                        console.log(err);
                        return callback(err, null);
                    } else {
                        return callback(null, result)
                    }
                });
            }

        })
    },
    getListing: function (id, callback) {
        var conn = db.getConnection();
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return callback(err, null);
            } else {
                var sql = "select l.title,l.category,l.description,l.price,u.username,l.fk_poster_id,i.name from listings l,users u,images i where l.id = ? and l.id = i.fk_product_id and l.fk_poster_id = u.id";
                conn.query(sql, [id], function (err, result) {
                    conn.end()
                    if (err) {
                        console.log(err);
                        return callback(err, null);
                    } else {
                        return callback(null, result)
                    }
                });
            }

        })
    },
    getOtherUsersListings: function (query, userid, callback) {
        var conn = db.getConnection();
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return callback(err, null);
            } else {
                var sql = "SELECT l.title, l.category, l.price, l.id, i.name " +
                          "FROM listings l " +
                          "JOIN images i ON l.id = i.fk_product_id " +
                          "WHERE l.fk_poster_id != ? AND l.title LIKE ?";
    
                // Use parameterized query with % wildcards
                conn.query(sql, [userid, `%${query}%`], function (err, result) {
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
    updateListing: function (title, category, description, price, id, callback) {
        var conn = db.getConnection();
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return callback(err, null);
            } else {
                var sql = "update listings set title = ?,category = ?,description = ?,price = ? where id = ?";
                conn.query(sql, [title, category, description, price, id], function (err, result) {
                    conn.end()
                    if (err) {
                        console.log(err);
                        return callback(err, null);
                    } else {
                        return callback(null, result)
                    }
                });
            }

        })
    },
    deleteListing: function (listingId, userId, callback) {
        var conn = db.getConnection();
        
        conn.connect(function (err) {
            if (err) {
                console.error("Database connection error:", err);
                return callback(err, null);
            }
    
            var sql = `DELETE FROM listings WHERE id = ? AND fk_poster_id = ?`; // Ensure user can only delete their own listing
    
            conn.query(sql, [listingId, userId], function (err, result) {
                conn.end();
    
                if (err) {
                    console.error("Error executing delete query:", err);
                    return callback(err, null);
                }
    
                return callback(null, result);
            });
        });
    },
}

module.exports = listingDB;