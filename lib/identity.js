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

var Activity = require("./activity.js"); //Needed for the error class
var querystring = require('querystring');
var crypto = require('crypto');

/**
 * Provides a mechanism for retrieving identity from an HMAC-signed request,
 * and verifying the validity and currency of the request signature.
 *
 * (Doesn't 'store' the identity itself, requires that the client does)
 * 
 * @author Patrick Barnes 
 */
module.exports = function(settings) {
	var Identity = {};
	
	Identity.generateKey = function(identity, expiry) {
		return crypto.createHmac('sha256', settings.auth.server_key).update(identity + expiry).digest('hex');
	};
	
	Identity.create = function(identity) {
		var expiry = Math.round(Date.now()/1000) + settings.auth.lifetime;
		return {identity:identity, expiry:expiry, client_key:Identity.generateKey(identity, expiry)};
	};
	
	Identity.test = function(request, options) {
		//If no header, the request is unsigned.
		var header = request.headers.authorization;
		if (!header) return false;
		
		//Parse the header
		if (! (m=/^HMAC (.*)$/.exec(header)) )
			throw new Activity.Error("Invalid Signature; Incorrect header format", 401);
		var params = querystring.parse(m[1]);
		if (!params.identity || !params.expiry || !params.signature)
			throw new Activity.Error("Missing one or more paramater - expect 'identity', 'expiry', 'signature'", 401);
		
		//Check expiry
        // (The signature is only valid from time of issue to expiry)
		var now = Math.round(Date.now()/1000);
		if (now > params.expiry || now < params.expiry - settings.auth.lifetime)
			throw new Activity.Error("Credentials are expired", 403);
		
		//Re-derive the client key from the identity/expiry and the server key
		var client_key = Identity.generateKey(params.identity, params.expiry);
		
		//Check the url has been signed with the valid client key
		var url = 'http://' + request.headers.host + request.url;
		var computed_signature = crypto.createHmac('sha256', client_key).update(request.method+url).digest('hex');
		if (computed_signature !== params.signature) {
			console.error("Forged signature: ", {identity: params.identity, expiry: params.expiry, url: url, signature: params.signature, computed_signature: computed_signature});
			throw new Activity.Error("Credentials are invalid", 403);
		}
		
		//Success! Found the client identity
        return params.identity;
    };
    
    return Identity;    
};