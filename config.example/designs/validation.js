/**
 * 
 */
if (typeof exports === "undefined") throw "Unexpected context - expected to be called from node.js";
require("underscore").extend(exports, {
	"id":"validation_test",
	"name": "Validation Test (Used for testing the schema validation...)",
	"version": 1,
	"states" : ['foo', 'bar'],
	"create" : {
		to: ['foo']
	},
	"actions": []
});