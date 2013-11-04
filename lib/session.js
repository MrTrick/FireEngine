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

var FireEngine = require("./fireengine.js"); //Needed for the error class
var Errors = require("./errors.js");
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
	var Session = {};
	
	/**
	 * Knowing the server key, generate a client key for the given identity and expiry
	 * @param identity
	 * @param expiry
	 * @returns string
	 */
	Session.generateKey = function(identity, expiry) {
		return crypto.createHmac('sha256', settings.server_key).update(identity + expiry).digest('hex');
	};
	
	/**
	 * Return a new session - contains identity, expiry, client key
	 * @param identity
	 * @returns object
	 */
	Session.create = function(identity) {
		var expiry = Math.round(Date.now()/1000) + settings.lifetime;
		return {identity:identity, expiry:expiry, client_key:Session.generateKey(identity, expiry)};
	};
	
	/**
	 * Check a request - has it been signed correctly?
	 * @param request
	 * @param options
	 * @returns true if signed correctly, false if unsigned.
	 * @throws Errors.Unauthorized if the signature is invalid
	 */
	Session.test = function(request, options) {
		//If no header, the request is unsigned.
		var header = request.headers.authorization;
		if (!header) return false;
		
		//Parse the header
		if (! (m=/^HMAC (.*)$/.exec(header)) )
			throw new Errors.Unauthorized("Invalid Signature; Incorrect header format");
		var params = querystring.parse(m[1]);
		if (!params.identity || !params.expiry || !params.signature)
			throw new Errors.Unauthorized("Missing one or more paramater - expect 'identity', 'expiry', 'signature'");
		
		//Check expiry
        // (The signature is only valid from time of issue to expiry)
		var now = Math.round(Date.now()/1000);
		if (now > params.expiry || now < params.expiry - settings.lifetime)
			throw new Errors.Unauthorized("Credentials are expired");
		
		//Re-derive the client key from the identity/expiry and the server key
		var client_key = Session.generateKey(params.identity, params.expiry);
		
		//Does the given URL match the server's URL?
		var url = request.protocol + '://';
		//Are we behind a proxy?
		if (request.headers['x-forwarded-host']) url += request.headers['x-forwarded-host'] + request.headers['x-forwarded-path'];
		else url += request.headers.host;
		url += request.originalUrl;
		
		if (url != params.url) throw new Errors.Unauthorized("URL does not match. Given: "+params.url+", Expected: "+url);
		
		//Check the url has been signed with the valid client key
		var computed_signature = crypto.createHmac('sha256', client_key).update(request.method+url).digest('hex');
		if (computed_signature !== params.signature) {
			console.error("Forged signature: ", {identity: params.identity, expiry: params.expiry, url: url, signature: params.signature, computed_signature: computed_signature});
			throw new Errors.Unauthorized("Credentials are invalid");
		}
		
		//Success! Found the client identity
        return params.identity;
    };
    
    /**
     * Sign a request as the given identity
     */
    Session.sign = function(request, identity) {
    	var expiry = Math.round(Date.now()/1000) + 30; //Expiry 30 seconds from now
		var client_key = Session.generateKey(identity, expiry); //Re-derive the client key from the identity/expiry and the server key
		var url = request.url;
		var method = request.method;
		
		var signature = crypto.createHmac('sha256', client_key).update(method+url).digest('hex');
		var auth_block = {identity:identity, expiry:expiry, url:url, signature:signature};
		//console.debug("Encoded '"+method+url+"' with key: " + client_key);
		//console.debug("Auth block: ", auth_block, "Url", url);
		request.set('Authorization', 'HMAC '+querystring.stringify(auth_block));
    };
    
    return Session;    
};