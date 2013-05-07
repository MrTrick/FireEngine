/**
 * 
 */
if (typeof module !== "object") throw "Unexpected context - expected to be called from node.js";
module.exports = {
	"id": "test_a_v1",
	"name": "Test A",
    "version": 1,
    "states": ["opened","closed"],
    "create" : {
    	"to" : ["opened"]
    },
    "actions": [
		{
			"id": "close",
			"name": "Close",
			"allowed": ['admin', 'creator'], //Only admin users or the creator can close 
			"from": ["opened"],
			"to": ["closed"]
		},
		{
		    "id": "open",
		    "name": "Reopen",
		    "from": ["closed"],
		    "to": ["opened"]
		},
		{
		    "id": "wheee",
		    "name": "Go round in circles",
		    "from": ["opened"],
		    "to": ["closed"]
		},
		{
		    "id": "nop",
		    "name": "Do nothing"
        }
	 ]
};