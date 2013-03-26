/**
 * 
 */
var _ = require('underscore');
var Backbone = require('backbone');
var bb_couch = require('../lib/bb_couch.js');
var settings = require('./settings.js');
var Activity = require('../lib/activity.js');
var Identity = require('../lib/identity.js')(settings);

var context = {};

//------------------------------------------------------------------
//What libraries are available to scripts?
context._ = _;
context.Backbone = Backbone;
context.JSV = require('JSV').JSV.createEnvironment();
context.Activity = Activity;

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

context.MyExternal = MyExternal;

//------------------------------------------------------------------

function contextBuilder(request) {
	var _context = _.extend({}, context);

	//Load the user_id in the context
	var user_id = Identity.test(request);
	console.log("Identity: ", user_id);
	_context.user = user_id;

	return _context;
}



module.exports = contextBuilder;