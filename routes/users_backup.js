//To run the application
var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var User = require('../models/user');

//Register
router.get('/register', function(req,res){
	res.render('register');
});

//Login
router.get('/login',function(req,res){
	res.render('login');
});

//Register User
router.post('/register', function(req,res){
	var name = req.body.name;
	var email = req.body.email;
	var username = req.body.username;
	var password = req.body.password;
	var password2 = req.body.password2;
	var field = req.body.field;

	//show what's been written in web to console(name)
	//console.log(name);

	//validation - Check to see if the field is empty
	req.checkBody('name', 'Name is required!').notEmpty();
	req.checkBody('email', 'Email is required!').notEmpty();
	req.checkBody('email', 'Email is not valid!').isEmail();
	req.checkBody('username', 'Username is required!').notEmpty();
	req.checkBody('password', 'Password is required!').notEmpty();
	req.checkBody('password2', 'Password does not match').equals(req.body.password);
	req.checkBody('field', 'Please specify if you are a Teacher or a Student!').notEmpty();

	var errors = req.validationErrors();

	if(errors){
		res.render('register',{
			errors:errors
		});
	}else{
			//new user in the model(user.js)
		var newUser = new User({
			name: name,
			email: email,
			username: username,
			password: password,
			field: field
		});

		User.createUser(newUser,function(err, user){
			if(err) throw err;
			console.log(user);
		});
		req.flash('success_msg', 'You are registed and can now login');

		res.redirect('/users/login');
	}
});

passport.use(new LocalStrategy(
	function(username, password, done){
	User.getUserByUsername(username, function(err, user){
		if(err) throw err;
		if(!user){
			return done(null, false, {message: 'Unknown User'});
		}

		User.comparePassword(password, user.password, function(err, isMatch){
			if(err) throw err;
			if(isMatch){
				return done(null, user);
			}
			else{
				return done(null, false, {message: "Invalid password"});
			}
		});
	});
}));

passport.serializeUser(function(user, done){
	done(null, user.id);
});

passport.deserializeUser(function(id, done){
	User.getUserById(id, function(err, user){
		done(err,user);
	});
});

router.post('/login',
	passport.authenticate('local',{sucessRedirect:'/',failureRedirect:'/users/login',failureFlash: true}),
	function(req,res){
		//dashboard
		if (req.user.field == "student") {
			req.flash('stud_val', 'student');
		}else if(req.user.field == "influencer"){
			req.flash('teach_val', 'influencer');
		}else if (req.user.field == "admin") {
			req.flash('admin_val', 'admin');
		}
		res.redirect('/');
	});

router.get('/logout',function(req, res){
	req.logout();
	req.flash('success_msg', 'You are logged out');

	res.redirect('/users/login');
});


module.exports = router;