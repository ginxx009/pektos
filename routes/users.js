//To run the application
var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

//====email verification======
var favicon = require('static-favicon'),
	logger = require('morgan'),
	crypto = require('crypto'),
	dotenv = require('dotenv');

	dotenv.load();
//============================

var User = require('../models/user');

var InfoUser = require('../models/user_backup');

// require the sendgrid for the email sending
var sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

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

	//temporary for emoney
	var e_money = req.body.e_money;

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
	
	//temporary for emoney
	req.checkBody('e_money','Please add some value in this field').notEmpty();

	var errors = req.validationErrors();

	if(errors){
		res.render('register',{
			errors:errors
		});
	}else{
		//email confirmation to generate authentication token
		var seed = crypto.randomBytes(20);
		var authToken = crypto.createHash('sha1').update(seed + req.body.email).digest('hex');

			//new user in the model(user.js)
		var newUser = new User({
			name: name,
			email: email,
			authToken: authToken,
			IsAuthenticated: false,
			username: username,
			password: password,
			field: field,
			e_money: e_money //temporary emoney

		});

		var newUser2 = new InfoUser({
			name: name,
			email: email,
			username:username,
			field:field,
			e_money:e_money
		});

		InfoUser.createUser(newUser2,function(err,user){
			if(err) throw err;
			console.log(user);
		});
		
			//save the newly created user to database
		User.createUser(newUser,function(err, user){
			if(err) throw err;
			console.log(user);

			//authenticate
			var authenticationURL = 'https://pektos10.herokuapp.com/users/verify_email?token=' + newUser.authToken;
			sendgrid.send({
				to: 	newUser.email,
				from: 	'pektospioneers.com',
				subject:'Authentication Required',
				html: 	'<a target=_blank href=\"'+ authenticationURL + '\">Please Click this to confirm your email</a>'
			}, function (err, json){
				if(err) throw err;
				console.log(json); 
			});	
		});
		
		req.flash('success_msg', 'Before proceeding to login please confirm your email');
		// res.render('email-verification');
		res.redirect('/users/login');
	}
});

router.get('/verify_email', function(req, res){
	console.log('verify_email token: ', req.query.token);

	User.findOne({authToken: req.query.token}, function(err, user){
		if(err){
			console.log(err);
			res.send(err);
		} else {
			console.log(user);
			user.IsAuthenticated = true;
			user.save(function(err){
				if(err){
					console.log(err);
					return res.send(err);
				} else {
					console.log('Successfully updated user');
					console.log(user);

					sendgrid.send({
						to: 	user.email,
						from: 	'pektospioneers.com',
						subject:'Email Confirmed!',
						html: 	'Thank you'
					}, function(err, json){
						if(err){
							console.log(err);
							res.send(err);
						} else {
							console.log(json);
						}
					});
				}
			});
		}
	});
		req.flash("success_msg",'Email has been confirmed!');
		res.redirect('/users/login');
});

//validate username and password using passport

passport.use(new LocalStrategy(
	function(username, password, done){

	User.getUserByUsername(username, function(err, user){
		if(err) throw err;
		if(!user){
			return done(null, false, {message: 'Unknown User'});
		}

	User.comparePassword(password, user.password, function(err, isMatch){
			if(err) throw err;

			//this will authenticated first the email if it is already verified or not
			if(isMatch && !user.IsAuthenticated) {
				return done(null,false,{message: "Please verify your email first"});
			//then if verified go to index
			} else if(isMatch && user.IsAuthenticated) {
				return done(null, user);
			} else {
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
})


module.exports = router;