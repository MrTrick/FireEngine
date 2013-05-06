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
 * sync_activity is a thin wrapper around sync_couch
 * 
 * It ensures that the design object is expanded on read (design id converted to object)
 * It ensures that the design object is collapsed on create/update (object converted to design id)
 * (Requires that Activity.Design.prototype.sync be set in the application)      
 */

var sync_couch = require("./sync_couch.js");
var Activity = require("./activity.js");

/**
 * Configure and return a sync function for interacting with the given database
 * @param dsn The connection string, eg 'http://localhost:5984/dbname'
 * @return A backbone sync function for that couchdb database 
 */
module.exports = function(dsn) {
	var sync = sync_couch(dsn);
	
	//Customise import of Activities 
	sync.import = function(attrs) {
		//Unpack the design into the document
		var design = attrs.design.id ? attrs.design : Activity.Design.prototype.sync.designs[ attrs.design ];
		if (!design) throw new Error("Invalid design id ; " + attrs.design); //TODO: This shouldn't happen, but is bad practice. 
		else attrs.design = design; 
		
		return attrs;
	};
	
	//Customise export of Activities
	sync.export = function(activity) {
		attrs = activity.toJSON();

		//Pack the design up into its id
		attrs.design = attrs.design.id;
		
		return attrs;
	};
	
	//If the default options need to be modified for all calls, it can be done here 
	//_.extend(sync.defaults, {});

	return sync;
};