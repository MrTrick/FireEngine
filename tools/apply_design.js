/*
 * FireEngine - Javascript Activity Engine 
 * 
 * @license Simplified BSD
 * Copyright (c) 2013, Patrick Barnes
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *    
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Apply a given design to a couch document
 */

//-----------------------------------------------------------------------------
//Read the input args
if (process.argv.length < 4) fail("Missing args, expect to be called like: `node apply_design.js DESIGN DB [DOC [FORCE]]`", 1);
var node = process.argv.shift();
var bin = process.argv.shift();
var design_name = process.argv.shift();
var db_dsn = process.argv.shift();
var activity_id = process.argv.shift();
var force = process.argv.shift();

//-----------------------------------------------------------------------------
//Infrastructure
var Activity = require("../lib/activity.js");
var Sanitize = require("../lib/sanitizer.js");
var bb_couch = require("../lib/bb_couch.js");
var fs = require("fs");
var path = require("path");
function fail(msg, code) { 	
	console.error(msg); 	
	process.exit(code); 
}

//Look at the FE_CONFIG_PATH environment variable for the location.
//By default, look in the 'config' subfolder. Or the 'config.example' subfolder, if 'config' is not defined.
var BASE_PATH = path.dirname(bin) + "/.."; 
var CONFIG_PATH = process.env.FE_CONFIG_PATH || (fs.existsSync(BASE_PATH + "/config") ? BASE_PATH + "/config" : BASE_PATH + "/config.example");

//-----------------------------------------------------------------------------
//Database connection
Activity.Model.prototype.sync = Activity.Collection.prototype.sync = bb_couch.backboneSync(db_dsn);

//-----------------------------------------------------------------------------
//Load the design
var design = Sanitize(require(
	fs.existsSync(design_name) ? design_name : CONFIG_PATH + "/designs/" + design_name + ".js"
));
//TODO: Use Activity.Design class

//-----------------------------------------------------------------------------
function upgrade(activity) {
	//Check the design - is it the same?
	var old = activity.get('design');
	if (!force && (design.name != old.name || design.version != old.version) )
		fail("New design for "+activity.id+" is a different name or version. Must force to override.\n" +
			 "New: "+design.name+" v"+design.version+", Old: "+old.name+" v"+old.version, 
			 1
		);
	
	//Check the states - don't put document in (now) invalid state
	var state = activity.get('state');
	if (_.difference(state, design.states).length)
		fail("Activity "+activity.id+" is in a state "+JSON.stringify(state)+" that doesn't exist in the new design. ("+JSON.stringify(design.states)+") Won't apply.", 1);
	
	//Modify and save the activity
	activity.save({design:design}, {
		success:function() {
			console.log("Successfully applied the design to activity "+activity.id+". Current rev; "+activity.get("_rev"));
		},
		error:function(activity,resp,options) {
			console.log("Failed to apply to "+activity.id+", error occurred");
			console.log(resp);
			process.exit(2);
		}
	});
}



//Was a particular activity specified?
if (activity_id) {
	var activity = new Activity.Model({_id : activity_id});
	activity.fetch({
		error: function(activity, error, options) { fail("Could not fetch activity", 2); },
		success: function() { upgrade(activity); }
	});
} else {
	var collection = new Activity.Collection();
	collection.fetch({
		view: { design: 'fireengine', name: 'by_design'},
		params: { key: design.id },
		error: function(activity, error, options) { fail("Could not fetch activities", 2); },
		//TODO: Have some kind of two-step process for a transactional every-or-none approach.
		success: function() { _.each(collection.models, upgrade); }
	});
}
