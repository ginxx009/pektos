var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');



//User Schema
//authToken and isAuthenticated is for UserSchema of email-verification
var UserSchema = mongoose.Schema({
	username:{
		type: String,
		unique: true,
		index:true
	},
	password:{
		type:String
	},
	email:{
		type:String,
		required: true
		// unique: true
	},
	authToken:{
		type: String,
		required: true,
		unique: true
	},
	IsAuthenticated:{
		type: Boolean,
		required: true
	},
	name:{
		type:String
	},
	field:{
		type:String
	},
	e_money:{
		type:Number //this is the integer form in mongoose
	}
});


//accesible variable from the outside
var User = module.exports = mongoose.model('users', UserSchema);

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

