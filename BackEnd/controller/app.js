

var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var user = require('../model/user.js');
var listing = require('../model/listing');
var offers = require('../model/offer');
var likes = require('../model/likes');
var images = require('../model/images')
var verifyToken = require('../auth/verifyToken.js');
const bcrypt = require('bcrypt');
const saltRounds = 10;
////////////////////////////////////////////
// Importing Libraries ////////////////////
var fs = require('fs');
const fileType = require('file-type');
var cors = require('cors');//Just use(security feature)
var path = require("path");
var multer = require('multer')

const validator = require('validator'); // Import validator library for sanitization

var morgan = require('morgan'); // Import morgan logging library
var rfs = require('rotating-file-stream'); // Import rotating-file-stream
var path = require('path'); // Import path module
// Importing Libraries ////////////////////
///////////////////////////////////////////

var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.options('*', cors());//Just use
app.use(cors());//Just use
app.use(bodyParser.json());
app.use(urlencodedParser);


// Create a rotating write stream
var logDirectory = path.join(__dirname, '../log'); // Path to the log directory
var appLogStream = rfs.createStream('access.log', {
    interval: '12h', // Rotate every 12 hours
    path: logDirectory // Write to the log subdirectory in the main project folder
});

// Define custom morgan token to log exceptions
morgan.token('exception', function (req, res) {
    return res.locals.errorMessage || '-'; // Return error message if exists, else '-'
});

morgan.token('json', function (req, res) {
    const filteredBody = { ...req.body };
    if (filteredBody.password) filteredBody.password = '******'; // ✅ Mask password
    if (filteredBody.token) filteredBody.token = '******';       // ✅ Mask tokens

    return JSON.stringify({
        exception: res.locals.errorMessage || '-',
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        body: filteredBody,
        date: new Date().toUTCString()
    });
});


// Use Morgan with the custom JSON format
app.use(morgan(':json', { stream: appLogStream }));


// Sanitization middleware
function sanitizeInput(req, res, next) {
    try {
        console.log("Sanitizing input...");
        console.log("Before:", req.body);

        if (req.body && typeof req.body === 'object') {
            Object.keys(req.body).forEach((key) => {
                if (typeof req.body[key] === 'string') {
                    req.body[key] = validator.trim(req.body[key]);   // Trim spaces
                    req.body[key] = validator.escape(req.body[key]); // Escape special characters
                }
            });
        }

        console.log("After:", req.body);

        next();
    } catch (err) {
        res.status(500).json({ success: false, message: 'Input sanitization failed', error: err });
    }
}


// Function to sanitize output data before sending it to the client
function sanitizeOutput(data) {
    if (Array.isArray(data)) {
        return data.map(item => sanitizeOutput(item));
    } else if (typeof data === 'object' && data !== null) {
        let sanitizedObject = {};
        for (let key in data) {
            if (Object.hasOwnProperty.call(data, key)) {
                sanitizedObject[key] = validator.escape(String(data[key])); // Escape HTML characters
            }
        }
        return sanitizedObject;
    } else {
        return validator.escape(String(data)); // Fallback for primitive values
    }
}

//User APIs
app.post('/user/login', function (req, res) {//Login
	var email = req.body.email;
	var password = req.body.password;

	user.loginUser(email, password, function (err, token, result) {
		if (err) {
			res.status(500);
			res.send(err.statusCode);
		} else {
			res.statusCode = 201;
			res.setHeader('Content-Type', 'application/json');
			delete result[0]['password'];//clear the password in json data, do not send back to client
			res.json({ success: true, UserData: JSON.stringify(result), token: token, status: 'You are successfully logged in!' });
		}
	});
});

app.post('/user', function (req, res) { // Create User
	var username = req.body.username;
	var email = req.body.email;
	var password = req.body.password;
	var firstname = req.body.firstname;
	var lastname = req.body.lastname;

	// Hash the password before saving it
	bcrypt.hash(password, saltRounds, function (err, hashedPassword) {
		if (err) {
			console.error("Error hashing password:", err);
			res.status(500).send({ error: "Internal Server Error" });
			return;
		}

		// Store hashed password instead of plain text
		user.addUser(username, email, hashedPassword, firstname, lastname, function (err, result) {
			if (err) {
				res.status(500).send(err);
			} else {
				res.status(201).json(result);
			}
		});
	});
});

app.post('/user/logout', function (req, res) {//Logout
	console.log("..logging out.");
	res.clearCookie('session-id'); //clears the cookie in the response
	res.setHeader('Content-Type', 'application/json');
	res.json({ success: true, status: 'Log out successful!' });

});


// Apply sanitization middleware to the update user route
app.put('/user/update/', verifyToken, sanitizeInput, function (req, res) {
console.log("update user")
console.log(req.body)

    var id = req.id;
    var username = req.body.username;
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    
    user.updateUser(username, firstname, lastname, id, function (err, result) {
        if (err) {
            res.status(500).json({ success: false });
        } else {
            res.status(200).json({ success: true });
        }
    });
});

//Listing APIs
app.post('/listing/', verifyToken, function (req, res) {//Add Listing
	var title = req.body.title;
	var category = req.body.category;
	var description = req.body.description;
	var price = req.body.price;
	var fk_poster_id = req.id;
	listing.addListing(title, category, description, price, fk_poster_id, function (err, result) {
		if (err) {
			res.status(500);
			res.json({ success: false });
		} else {
			res.status(201);
			res.setHeader('Content-Type', 'application/json');
			res.json({ success: true,id:result.insertId })
		}
	});
});


app.get('/user/listing', verifyToken, function (req, res) {//Get all Listings of the User
	var userid = req.id;
	listing.getUserListings(userid, function (err, result) {
		if (err) {
			res.status(500);
			console.log(err)
			res.json({ success: false });
		} else {
			res.status(200);
			res.setHeader('Content-Type', 'application/json');
			res.json({ success: true, result: sanitizeOutput(result) });
		}
	});
});

app.get('/listing/:id', function (req, res) {//View a listing
	var id = req.params.id
	listing.getListing(id, function (err, result) {
		if (err) {
			res.status(500);
			res.json({ success: false })
		} else {
			res.status(200);
			res.setHeader('Content-Type', 'application/json');
			res.json({ success: true, result: sanitizeOutput(result) })
		}
	});
});

app.get('/search/:query', verifyToken, function (req, res) {//View all other user's listing that matches the search
	console.log("qeury: " +req.params.query)
	var query = req.params.query;
	var userid = req.id;
	listing.getOtherUsersListings(query, userid, function (err, result) {
		if (err) {
			res.status(500);
			res.json({ success: false })
		} else {
			res.status(200);
			res.setHeader('Content-Type', 'application/json');
			res.json({ success: true, result: sanitizeOutput(result) })
		}
	});
});

app.put('/listing/update/', sanitizeInput, function (req, res) {//View a listing
	var title = req.body.title;
	var category = req.body.category;
	var description = req.body.description;
	var price = req.body.price;
	var id = req.body.id;
console.log("update listing")

	listing.updateListing(title, category, description, price, id, function (err, result) {
		if (err) {
			console.log("err"+err)
			res.locals.errorMessage = err.message || 'Database error';  // ✅ Store error for Morgan
			res.status(500);
			res.json({ success: false })
		} else {
			res.status(200);
			res.setHeader('Content-Type', 'application/json');
			res.json({ success: true })
		}
	});
});

app.delete('/listing/delete/', verifyToken, function (req, res) {
    console.log("Incoming delete request...");

    const listingId = req.body.id;
    const userId = req.id; // Retrieved from verifyToken middleware

    if (!listingId) {
        return res.status(400).json({ success: false, message: "Listing ID is required" });
    }

    console.log(`User ${userId} attempting to delete listing ${listingId}`);

    listing.deleteListing(listingId, userId, function (err, result) {
        if (err) {
            console.error("Error deleting listing:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        if (result.affectedRows === 0) {
            return res.status(403).json({ success: false, message: "Unauthorized: Cannot delete this listing" });
        }

        console.log(`Listing ${listingId} successfully deleted by user ${userId}`);
        res.status(200).json({ success: true, message: "Listing deleted successfully" });
    });
});


//Offers API
app.post('/offer/', verifyToken, function (req, res) {//View a listing
	var offer = req.body.offer;
	var fk_listing_id = req.body.fk_listing_id;
	var fk_offeror_id = req.id;
	var status = "pending";
	offers.addOffer(offer, fk_listing_id, fk_offeror_id, status, function (err, result) {
		if (err) {
			res.status(500);
			res.json({ success: false })
		} else {
			res.status(201);
			res.setHeader('Content-Type', 'application/json');
			res.json({ success: true })
		}
	});
});

app.get('/offer/', verifyToken, function (req, res) {//View all offers
	var userid = req.id
	offers.getOffers(userid, function (err, result) {
		if (err) {
			res.status(500);
			res.json({ success: false })
		} else {
			res.status(201);
			res.setHeader('Content-Type', 'application/json');
			console.log(result)
			res.json({ success: true, result: result })
		}
	});
});


app.post('/offer/decision/', verifyToken, function (req, res) {//View all offers
	var status = req.body.status;
	var offerid = req.body.offerid;
	console.log("status: "+status)
	offers.AcceptOrRejectOffer(status, offerid, function (err, result) {
		if (err) {
			console.log("err: "+err)
			res.status(500);
			res.json({ success: false })
		} else {
			res.status(201);
			res.setHeader('Content-Type', 'application/json');
			res.json({ success: true })
		}
	});
});

app.get('/offer/status/', verifyToken, function (req, res) {//View all offers
	var userid = req.id
	offers.getOfferStatus(userid, function (err, result) {
		if (err) {
			res.status(500);
			res.json({ success: false })
		} else {
			res.status(201);
			res.setHeader('Content-Type', 'application/json');
			res.json({ success: true, result: result })
		}
	});
});

//Likes API
app.post('/likes/', verifyToken, function (req, res) {//View all offers
	var userid = req.id
	var listingid = req.body.listingid;
	likes.insertLike(userid, listingid, function (err, result) {
		if (err) {
			res.status(500);
			res.json({ success: false })
		} else {
			res.status(201);
			res.setHeader('Content-Type', 'application/json');
			res.json({ success: true })
		}
	});
});

app.get('/likeorunlike/:listingid/', verifyToken, function (req, res) {//Like or Unlike
	var userid = req.id
	var listingid = req.params.listingid;
	likes.checklike(userid, listingid, function (err, result) {
		if (err) {
			res.status(500);
			res.json({ success: false })
		} else {
			res.status(200);
			if (result.length == 0) {
				likes.insertLike(userid, listingid, function (err, result) {
					if (err) {
						res.status(500);
						res.json({ success: false })
					} else {
						res.status(201);
						res.setHeader('Content-Type', 'application/json');
						res.json({ success: true, action: "liked" })
					}
				});
			} else {
				likes.deleteLike(userid, listingid, function (err, result) {
					if (err) {
						res.status(500);
						res.json({ success: false })
					} else {
						res.status(200);
						res.json({ success: true, action: "unliked" })
					}
				});
			}
		}
	});
});

app.get('/likes/:listingid/', function (req, res) {//View all offers
	var listingid = req.params.listingid;
	likes.getLike(listingid, function (err, result) {
		if (err) {
			res.status(500);
			res.json({ success: false })
		} else {
			res.status(200);
			res.setHeader('Content-Type', 'application/json');
			res.json({ success: true, amount: result.length })
		}
	});
});

//Images API

let storage = multer.diskStorage({
	destination: function (req, file, callback) {

		callback(null, __dirname + "/../public")
	},
	filename: function (req, file, cb) {
		req.filename = file.originalname.replace(path.extname(file.originalname), '') + '-' + Date.now() + path.extname(file.originalname);
		cb(null, req.filename);
		
	}
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        let allowedTypes = /jpeg|jpg|webp|png/;
        let extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        let mimeType = allowedTypes.test(file.mimetype);

        if (extName && mimeType) {
            return cb(null, true);
        } else {
            return cb(new Error('Only images are allowed! (jpeg, jpg, webp, png)'), false);
        }
    }
});


app.post('/images/:fk_product_id/', (req, res) => {
    upload.single('myfile')(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            // Multer errors (file too large, etc.)
            return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
            // Custom errors (e.g., invalid file type)
            return res.status(400).json({ success: false, message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        try {
            const fk_product_id = req.params.fk_product_id;
            const filePath = req.file.path;
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

            // Detect the actual MIME type of the file
            const fileBuffer = fs.readFileSync(filePath);
			const detectedType = await fileType.fromBuffer(fileBuffer);

            if (!detectedType || !allowedTypes.includes(detectedType.mime)) {
                fs.unlinkSync(filePath); // Remove invalid file
                return res.status(400).json({ success: false, message: 'Invalid file type! Only JPG, JPEG, PNG, and WEBP are allowed.' });
            }

            const name = req.file.filename;

            images.uploadImage(name, fk_product_id, function (err, result) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error saving image' });
                }
                res.status(201).json({ success: true, message: 'Image uploaded successfully' });
            });

        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
        }
    });
});

module.exports = app;