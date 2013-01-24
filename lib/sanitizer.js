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
 * Provide a means to 'sanitize' modules into a JSON-compatible format.
 * Converts any functions into their string form, so they can be reconstituted with new Function('...') 
 * 
 * NB: Only supports argumentless functions at this time.
 */
var nano = require("nano");
var _ = require("underscore");
//-----------------------------------------------------------------------------
function sanitizeFunction(func) {
    var m = /^\s*function\s*\(([^\)]*)\)\s*\{([^]*)\}\s*$/.exec(func.toString());
    if (!m) throw "Invalid function!";
    if (m[1]) throw "Should not expect any arguments";
    return m[2].trim();
}

function sanitize(o) {
	_.each(o, function(v,k) {
		_.isObject(v) ? _.isFunction(v) ? o[k]=sanitizeFunction(v) : sanitize(v) : 0;
	});
	return o;
}
//-----------------------------------------------------------------------------
module.exports = sanitize;
