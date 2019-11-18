var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');



//User Schema
var UserSchema = mongoose.Schema({
	username:{
		type: String,
		index:true
	},
	password:{
		type:String
	},
	email:{
		type:String
	},
	name:{
		type:String
	},
	field:{
		type:String
	}
});

//accesible variable from the outside

var User = module.exports = mongoose.model('User', UserSchema);

//create the user
module.exports.createUser= function(newUser, callback){
	bcrypt.genSalt(10, function(err,salt){
	bcrypt.hash(newUser.password, salt, function(err, hash){
		//store hash in your password DB
		newUser.password = hash;
		newUser.save(callback);
	});
});
}

module.exports.getUserByUsername = function(username, callback){
	var query = {username: username};
	User.findOne(query, callback);
}

module.exports.getUserById = function(id, callback){
	User.findById(id, callback);
}

module.exports.comparePassword = function(candidatePassword, hash, callback){
	bcrypt.compare(candidatePassword, hash, function(err, isMatch){
		if(err) throw err;
		callback(null, isMatch);
	});
}

module.exports.updateCredits = function(username, usercredits, callback) {
	var user = {username: username};
	var credits = {credit: usercredits};
	User.update(user, {$set: credits});
}