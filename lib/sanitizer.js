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
