/**
 * 
 */
exports.serverport = 8000;
exports.activity_db =  "http://localhost:5984/fireengine";
exports.fire_timeout = 5000;

exports.myexternaldb = "http://localhost:5984/fireengine_testexternal";

var _ = require('underscore');
var FireEngine = require('../lib/fireengine.js');

//-----------------------------------------------------------------------------
//Define connections
exports.sync = {};

// How does FireEngine access Activities? 
var sync_activity = require("../lib/sync_activity.js");
exports.sync.activity = sync_activity(exports.activity_db);

//How does FireEngine access Designs?
var sync_design = require("../lib/sync_design.js");
exports.sync.design = sync_design( require('fs').realpathSync( CONFIG_PATH + "designs" ) );

//How does FireEngine access Users?
// (For the example config, just use some dummy users in an array)
var users = [
    {id:"adummy", password:"adummy", display_name:"Andrew Dummy", email_primary: "fireengine.adummy@mindbleach.com", roles: ["admin"]},
    {id:"bdummy", password:"bdummy", display_name:"Brian Dummy", email_primary: "fireengine.bdummy@mindbleach.com", roles: ["manager"]},
    {id:"cdummy", password:"cdummy", display_name:"Caroline Dummy", email_primary: "fireengine.cdummy@mindbleach.com", roles: []}
];
exports.sync.user = function(method, model, options) {
	if (method == 'read' && model instanceof Backbone.Model) {
		var user = _.find(users, function(u) { return u.id == model.id; });
		if (user) options.success(user);
		else options.error(new Errors.NotFound("No user found with id " + model.id));
	} else {
		console.error("[Sync] Illegal method/model on user sync", method);
		options.error(new Errors.Forbidden("Illegal method/model on user sync"));
	}
};

//-----------------------------------------------------------------------------
//Define session settings and authentication
exports.session = {
	server_key: 'SECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRET',
	lifetime: 3600*12
};

exports.auth = {
	/**
	 * User login - given the credentials, call success(id) or failure(error)
	 */
	login: function(credentials, options) {
		//For the example, just authenticate against the dummy user list
		var user = _.find(users, function(u) { return u.id == credentials.username; });
		//(password same as username)
		if (user && credentials.password == user.password) {
			options.success(user.id);
		} else {
			console.log(credentials);
			options.error(new Errors.Unauthorized("Incorrect credentials"));
		}
	}

	/**
	 * User logout - not used
	 */
};

//-----------------------------------------------------------------------------
//Define access rules
exports.acl_rules = {
	'_all' : [],
	'/auth/self' : [],
	'/designs' : [],
	'/designs/:design' : [],
	'/designs/:design/fire/create' : [],
	'/activities' : [],
	'/activities/view/:view' : [],
	'/activities/:activity' : [],
	'/activities/:activity/fire/:action' : []
};