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

(function() {
	//Housekeeping - ensures the file is usable on node.js and on client
	var User = this.User = (typeof exports !== "undefined") ? exports : {};
	if (typeof require != "undefined") {
		if (typeof _ == "undefined") _ = require("underscore");
		if (typeof Backbone == "undefined") Backbone = require("backbone");
		if (typeof JSV == "undefined") JSV = require("JSV").JSV;
	}
 

	User.Model = Backbone.Model.extend({
		defaults: { roles: [] },
		
		/**
		 * Validate the action according to its schema
		 * @param attrs
		 * 
		 * @returns
		 */
		validate: function(attrs) {
			var data = _.extend({}, this.attributes, attrs);
			var instance = User.environment.createInstance(data, this.id);
			var report = User.schemas.user.validate( instance );

			if (report.errors.length) return report.errors; //TODO: Report should be formatted to match some standard?
		}
	});
	
 	User.environment = JSV.createEnvironment();
 	User.schemas = {
 		user: User.environment.createSchema({
	 		id: "user",
	 		description: "A FireEngine user",
	 		type: "object",
	 		properties: {
	 		    id: { type: "string", required: true },
	 		    display_name: { type: "string" },
	 		    email: { type: "array", items: { type: "string", format: "email" } },
	 		    roles: { type: "array", required: true }
	 		}
	 	}, null, "User.schemas")
 	};
	 	
}).call(this);