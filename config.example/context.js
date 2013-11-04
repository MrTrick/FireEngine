/**
 * 
 */
var _ = require('underscore');
var Backbone = require('backbone');
var sync_couch = require('../lib/sync_couch.js');
var settings = require('./settings.js');
var FireEngine = require('../lib/fireengine.js');
var User = require('../lib/user.js');

var base_context = {};

//------------------------------------------------------------------
//What libraries are available to scripts?
base_context._ = _;
base_context.Backbone = Backbone;
base_context.JSV = require('JSV').JSV.createEnvironment();
base_context.FireEngine = FireEngine;
base_context.User = User;

//------------------------------------------------------------------
//Example: Emailing
var transport = require('nodemailer').createTransport('Sendmail');
//var transport = require('nodemailer').createTransport('SMTP', { 'host': 'MYSERVER' }); //Alternatively SMTP directly - will throw error if fails.
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
	var identity = false;

	//Load the context
	req.context = _.extend({}, base_context);

	//Try to load the identity from the session, and load the user
	try { identity = req.app.get('session').test(req); } 
	catch(error) { return next(error); }
	
	//TODO: TO ASSIST DEBUGGING ONLY, DO NOT USE FOR REAL context.js!
	// (If the req isn't signed and the 'identity=USER_ID' query value is given, use it.)	
	//if (!identity && req.query.identity) identity = req.query.identity;
	//TODO: TO ASSIST DEBUGGING ONLY, DO NOT USE FOR REAL context.js!	
	
	if (identity) console.log("[Context] identity:", identity);
	req.context.identity = identity;
	
	//Load the user if identity known
	if (identity) {
		var user = req.user = req.context.user = new User.Model({id:identity});
		user.fetch({
			success: function() { next(); },
			error: function(model, e) { next(e); }
		});
	} else next();
}

module.exports = buildContext;