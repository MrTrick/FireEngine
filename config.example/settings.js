/**
 * 
 */
exports.serverport = 8000;
exports.activity_db =  "http://localhost:5984/fireengine";
exports.fire_timeout = 5000;

exports.myexternaldb = "http://localhost:5984/fireengine_testexternal";

var _ = require('underscore');
var Activity = require('../lib/activity.js');

//-----------------------------------------------------------------------------
//Define connections
exports.sync = {};

// How does FireEngine access Activities? 
var sync_couch = require("../lib/sync_couch.js");
exports.sync.activity = sync_couch(exports.activity_db);

//How does FireEngine access Designs?
var sync_design = require("../lib/sync_design.js");
exports.sync.design = sync_design( require('fs').realpathSync( CONFIG_PATH + "designs" ) );

//How does FireEngine access Users?
// (For the example config, just use some dummy users in an array)
var users = [
    {id:"adummy", display_name:"Andrew Dummy", email_primary: "fireengine.adummy@example.com", roles: ["admin"]},
    {id:"bdummy", display_name:"Brian Dummy", email_primary: "fireengine.bdummy@example.com", roles: ["manager"]},
    {id:"cdummy", display_name:"Caroline Dummy", email_primary: "fireengine.cdummy@example.com", roles: []}
];
exports.sync.user = function(method, model, options) {
	if (method == 'read' && model instanceof Backbone.Model) {
		var user = _.find(users, function(u) { return u.id == model.id; });
		if (user) options.success(model, user, options);
		else options.error(model, new Activity.Error("No user found with id " + model.id, 404), options);
	} else {
		console.error("[Sync] Illegal method/model on user sync", method);
		options.error(model, new Activity.Error("Illegal method/model on user sync", 403), options);
	}
};

//-----------------------------------------------------------------------------
//Define session settings and authentication
exports.session = {
	server_key: 'SECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRETSECRET',
	lifetime: 3600
};

exports.auth = {
	/**
	 * User login - given the credentials, call success(id) or failure(error)
	 */
	login: function(credentials, options) {
		//For the example, just authenticate against the dummy user list
		var user = _.find(users, function(u) { return u.id == credentials.username; });
		//(password same as username)
		if (user && credentials.password == user.id) {
			options.success(user.id);
		} else {
			options.error(new Activity.Error("Incorrect credentials", 403));
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
	'/activities/:activity' : [],
	'/activities/:activity/fire/:action' : []
};