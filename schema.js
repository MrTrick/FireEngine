/**
 * 
 */
still needs work... not used yet
{
	"description": "Schema describing an activity design"
	"type": "object",
	"properties": {
		"id" : { "type": "string", "pattern": "/^\w+$/", "required": true },
		"name" : { "type": "string", "required": true },
		"version" : { "type" : "integer", "minimum":1 },
		"states" : { "$ref" : "#/definitions/states" },
		"create" : { "$ref" : "#/definitions/action" },
		"actions" : {
			"type" : "array",
			"items" : { "$ref" : "#/definitions/action" }
		}
	},
	"definitions" : {
		"states" : { 
			"type": "array", 
			"items" : { "type": "string", "pattern": "/^\w+$/" }, 
			"uniqueItems": true 
		},
		"callback" : {
			"type" : [ "string", "null" ]
			//Any other restrictions?
		},
		"action" : {
			"description" : "Schema describing an action"
			"type" : "object",
			"properties" : {
				"id" : { "type": "string", "pattern": "/^\w+$/", "required": true },
				"name" : { "type": "string" },
				"from" : { "$ref" : "#/definitions/states" },
				"to" : { "$ref" : "#/definitions/states" },
				"allowed" : { "$ref" : "#/definitions/callback" },
				"prepare" : { "$ref" : "#/definitions/callback" },
				"fire" : { "$ref" : "#/definitions/callback" },
				"validate" : { "type" : "object" } //.... this is meant to be a valid json-schema (or a function?)
			}
		}
	}
}