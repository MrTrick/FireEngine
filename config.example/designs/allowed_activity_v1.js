/**
 * 
 */
if (typeof module === "undefined") throw "Unexpected context - expected to be called from node.js";
module.exports = {
	//Basic information about the activity
	id: "allowed_activity_v1",
	version: 1,
	name: "Example: Allowed Activity",
	description: "This activity demonstrates aspects of how access can be restricted on an entire Activity.",
	
	//The set of states the Activity can occupy
	states: ['opened', 'closed', 'unlocked'],
	
	//Creating the activity
	create: {
	    to: ['opened']
	},
	
	//Activity-wide restrictions
	allowed: {
		//Only admin or manager can read the activity (adummy & bdummy can read, cdummy cannot)
		read: ['manager', 'admin'], 
		//Only the admin or creator can fire actions *unless* in the 'unlocked' state
		fire: function() { 
			return _.contains(activity.get('state'), 'unlocked') || _.intersection(user.get('roles'), ['admin', 'creator']).length; 
		}
	},
	
    //Actions!
    actions: [
		{ 
			id: 'close',
			from: ['opened'],
			to: ['closed']
		},
		{ 
			id: 'open',
			from: ['closed'], 
			to: ['opened'] 
		},
		//Add the 'unlocked' state
		{  
			id: 'unlock',
			notfrom: ['unlocked'],
			to: ['unlocked']
		},
		//Remove the 'unlocked' state
		{
			id: 'lock',
			from: ['unlocked'],
			to: []					
		}
    ]
};