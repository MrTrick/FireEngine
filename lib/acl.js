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
 * Enforce access control on the request's user according to the given rules.
 * If this middleware is invoked without a user, the request will be denied.
 * 
 * Rules is expected to be a map of route -> roles.
 *  - Each route key should correspond with a route defined by one of the app.VERB calls.
 *  - The special key '_all' will be invoked for all routes.
 *  - roles may be a string or an array of role names
 *  - roles may be an object containing roles in 'all' and/or 'any' attributes.
 *  - If a string or array, will be equivalent to 'all'.
 *  - If unrestricted, roles should be empty or falsy.
 *     
 * Access will be granted for users who have all of the named 'all' roles, and any of the 'any' roles.
 * 
 * If a route is not named in the rules, a warning will be generated.
 * 
 * e.g:
 * rules = {
 *   '_all' : 'fireengineuser',										//Must be a fireengine user
 * 	 '/activities/' : 'staff', 										//To view all activities; staff members
 *   '/activities/:activity' : { 'any' : ['staff', 'external'] },   //To view specific activity; staff OR external 
 *   '/designs/:design/fire/create' : ['staff', 'admin'],    		//To create; must be staff AND admin
 *   '/designs/' : []												//To view designs; no restriction
 * }    
 * 
 */
var _ = require("underscore");
var Activity = require("./activity.js");

/**
 * Convert a rule into a consistent object format
 */
function transformRule(rule, name) {
	if (_.isEmpty(rule)) return null;
	else if(_.isString(rule)) return {"all": _.union(rule)};
	else if(_.isArray(rule)) return {"all": _.union(rule)};
	else if(_.isObject(rule)) {
		if (rule.all) rule.all = _.union(rule.all);
		if (rule.any) rule.any = _.union(rule.any);
		return rule;
	}
	else throw new Error("The '"+name+"' rule is invalid");
};

/**
 * Check a rule against a user's roles
 */
function allowed(user, rule) {
	if (!rule) return true;
	
	roles = _.union(user.roles); 
	return (!rule.all || _.intersection(roles, rule.all).length == rule.all.length) &&
		   (!rule.any || _.intersection(roles, rule.any).length >= 1);
}

module.exports = function(rules) {
	if (_.isEmpty(rules)) throw new Error("No rules given");
	
	//Validate and convert the rules to standard form
	_.each(rules, function(rule, route) { rules[route] = transformRule(rule, route); });
	
	//Return the middleware	that implements access control
	return function(req, res, next) {
		console.log("[ACL] Checking access for", req.user ? req.user.id : "null", "on", req.route.path);
		
		//Require the user to have authenticated
		if (!req.user) 
			return next(new Activity.Error("Authenticated user required", 401));
		
		//Enforce all-route rules
		if (rules._all && !allowed(req.user, rules._all)) 
			return next(new Activity.Error("Access forbidden", 403));
		
		//Find the relevant rule
		var rule = rules[ req.route.path ];
		if (typeof rule == "undefined")
			console.warn("Route " + req.route.path + " was invoked with acl middleware, but no rule for that route was known."); //TODO: How else to log warnings?
		else if (!allowed(req.user, rule))
			return next(new Activity.Error("Access forbidden", 403));
		
		return next();
	};
};