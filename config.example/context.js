/**
 * 
 */
var _ = require('underscore');
var Backbone = require('backbone');
var sync_couch = require('../lib/sync_couch.js');
var settings = require('./settings.js');
var Activity = require('../lib/activity.js');
var User = require('../lib/user.js');

var base_context = {};

//------------------------------------------------------------------
//What libraries are available to scripts?
base_context._ = _;
base_context.Backbone = Backbone;
base_context.JSV = require('JSV').JSV.createEnvironment();
base_context.Activity = Activity;
base_context.User = User;

//------------------------------------------------------------------
//Example: Emailing
//var transport = require('nodemailer').createTransport('Sendmail');
var transport = require('nodemailer').createTransport('SMTP', { 'host': 'postoffice.eng.uts.edu.au' });
base_context.email = function(mailOptions, callback) {
	mailOptions = _.extend({}, mailOptions, {
		'from': "noreply-fireengine@example.com",
		'subject': "[FireEngine] " + mailOptions.subject
	});
	console.log("Email transport", transport);
	return transport.sendMail(mailOptions, callback);
};


//------------------------------------------------------------------
//Example: Define the 'MyExternal' model and collections
var MyExternal = {};
var myexternalsync = sync_couch(settings.myexternaldb);

MyExternal.Model = Backbone.Model.extend({
	idAttribute: '_id',
	sync: myexternalsync
});

MyExternal.Collection = Backbone.Collection.extend({
	model: MyExternal.Model,
	sync: myexternalsync
});

base_context.MyExternal = MyExternal;

//------------------------------------------------------------------
//Middleware to load the context into the request
function buildContext(req, res, next) {
	var user_id;

	//Load the context
	req.context = _.extend({}, base_context);


	//Try to load the identity from the session, and load the user
	try {
		user_id = req.app.get('session').test(req);
	} catch(error) {
		next(error);
	}
	
	//TODO: TO ASSIST DEBUGGING ONLY, DO NOT USE FOR REAL context.js!
	// (If the req isn't signed and the 'user_id=USER_ID' query value is given, use it.)	
	if (!user_id && req.query.user_id) user_id = req.query.user_id;
	//      TO ASSIST DEBUGGING ONLY, DO NOT USE FOR REAL context.js!

	
	console.log("[Identity]", user_id);
	req.context.user_id = user_id;
	
	//Load the user if identity known
	if (user_id) {
		var user = req.user = req.context.user = new User.Model({id:user_id});
		user.fetch({
			success: function() { next(); },
			error: function(model, e) { next(e); }
		});
	} else next();
}

module.exports = buildContext;