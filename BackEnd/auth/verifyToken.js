

var jwt = require('jsonwebtoken');
var config = require('../config');

function verifyToken(req, res, next){

    var token = req.headers['authorization']; //retrieve authorization header's content

    if(!token || !token.includes('Bearer')){ 
       // Store error messages inside res.locals to be stored and displayed in the morgan's exception logger
       res.locals.errorMessage = { auth: false, message: 'Not authorized!' };
       res.status(403);
       return res.send({auth:'false', message:'Not authorized!'});
    }else{
       token=token.split('Bearer ')[1]; //obtain the token's value
       jwt.verify(token, config.key, function(err, decoded){ //verify token
        if(err){
            // Store error messages inside res.locals to be stored and displayed in the morgan's exception logger
            res.locals.errorMessage = { auth: false, message: 'Not authorized!' };
            res.status(403);
            return res.end({auth:false, message:'Not authorized!'});
        }else{
            req.id = decoded.id
            next();
        }
       });
    }
}

module.exports = verifyToken;