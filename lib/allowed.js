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
 * Interprets access-control rules in a standard manner.
 * 
 * When a rule is 'built' it's constructed into a function.
 * Call the function with desired context to have the rule evaluated.
 * 
 * Rules:
 *  - empty; Returns null
 *  - function; Passed through
 *  - function string; Coerced into a function
 *  - string; Require that the user have that role
 *  - array; Require that the user have any of those roles
 *  - object; Require that the user have any 'any' role, and all 'all' roles.
 *  
 */
(function() {
	//Housekeeping - ensures the file is usable on node.js and on client
	var Allowed = this.Allowed = (typeof exports !== "undefined") ? exports : {};
	if (typeof window == 'undefined') {
		_ = require("underscore");
	}
	
	/**
	 * Convert a rule into a true/false assert function
	 * 
	 * Assumes that the function will be called with scope having a 'user' attribute,
     * and that the 'user' object has a 'roles' function taking an activity parameter. 
     * (e.g. That roles() returns a list of roles the user has on that activity)
	 */
	Allowed.buildRule = function(rule) {
		//If empty or a function, return early 
		if (_.isFunction(rule)) return rule;
		else if (_.isEmpty(rule)) return null;
		else if (_.isString(rule) && rule.indexOf(" ") != -1) return new Function("with(this) {\n"+rule+"\n}"); //Assume strings containing spaces are functions 
	
		//If a role list, build and return a closure over it
		var all = undefined, any = undefined;
		if (_.isString(rule) || _.isArray(rule)) any = _.union(rule);
		else if (_.isObject(rule)) {
			all = _.union(rule.all || []);
			any = _.union(rule.any || []);
		}
		if (!all && !any) return null;
		else return function allowed() {
			if (!this || !this.user) return false; // No user, and some role required? Short-circuit fail.
			
			//Load the user roles, and the roles on the activity
			var roles = _.result(this.user, 'roles') || [];
			if (!_.isArray(roles)) throw new Error("user.roles must be or return an array"); 
			if (this.activity) roles = _.union(roles, this.activity.roles(this.user.id));
			
			//Valid if the user has every 'all' role, or at least one 'any' role.
			return (!all || !all.length || _.intersection(roles, all).length == all.length) &&
				   (!any || !any.length || _.intersection(roles, any).length > 0);
		};
	};
	
	/**
	 * Build several rules into an expressjs middleware closure.
	 * Server only. 
	 */
	Allowed.systemAccess = function(rules) {
		//Convert each to standard form
		_.each(rules, function(rule, route) { rules[route] = Allowed.buildRule(rule); });
	
		//Return the middleware	that implements access control
		return function(req, res, next) {
			var Errors = require("./errors");
			console.log("[ACL] Checking access for", req.user ? req.user.id : "null", "on", req.route.path);
			
			//Require the user to have authenticated
			if (!req.user) 
				return next(new Errors.Unauthorized());
			
			//Enforce all-route rules
			if (rules._all && !rules._all.call(req.context))
				return next(new Errors.Forbidden());
			
			//Find the relevant rule
			var rule = rules[ req.route.path ];
			if (typeof rule == "undefined")
				console.warn("Route " + req.route.path + " was invoked with acl middleware, but no rule for that route was known."); //TODO: How else to log warnings?
			else if (rule && !rule.call(req.context))
				return next(new Errors.Forbidden());
			
			return next();
		};
	};	
}).call(this);