/**
 * 
 */
var _ = require('underscore');
var Backbone = require('backbone');
var bb_couch = require('../lib/bb_couch.js');
var settings = require('./settings.js');
var Activity = require('../lib/activity.js');
var Session = require('../lib/session.js')(settings.session);
var User = require('../lib/user.js');

var base_context = {};

//------------------------------------------------------------------
//What libraries are available to scripts?
base_context._ = _;
base_context.Backbone = Backbone;
base_context.JSV = require('JSV').JSV.createEnvironment();
base_context.Activity = Activity;

//------------------------------------------------------------------
//Example: Define the 'MyExternal' model and collections
var MyExternal = {};
var myexternalsync = bb_couch(settings.myexternaldb);

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

function buildContext(request, success, error) {
	var context = _.extend({}, base_context);
	var user_id;

	//Try to load the identity from the session, and load the user
	try {
		user_id = Session.test(request);
	} catch(e) {
		return error(e);
	}
	
	//If the request isn't signed and the 'identity=USER_ID' query value is given, use it. 
	//TODO: TO ASSIST DEBUGGING ONLY, DO NOT USE FOR REAL context.js
	if (!user_id) {
		var query = require('url').parse(request.url, true).query;
		if (query.identity) user_id = query.identity;
	}
	console.log("Identity: ", user_id);
	context.user_id = user_id;
	
	//Load the user if identity known
	if (user_id) {
		context.user = new User.Model({id:user_id});
		context.user.fetch({
			success: function() { success(context); },
			error: function(model, e) { error(e); }
		});
	} else {
		success(context);
	}
}

module.exports = buildContext;