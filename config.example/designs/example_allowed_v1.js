/**
 * This activity demonstrates aspects of how access can be restricted on an action, or an entire Activity.
 * 
 * It has activity-level restrictions encoded into the allowed.read and allowed.fire values.
 * It has two restricted actions - unlock and lock - that can only be performed by the creator of the activity.
 * 
 * This activity also demonstrates some subtle points about states;
 *  - Activities can have multiple states.
 *  - Actions affect only their 'to' and 'from' states, the activity's other states are undisturbed.  
 */
if (typeof module === "undefined") throw "Unexpected context - expected to be called from node.js";
module.exports = {
	//Basic information about the activity
	id: "example_allowed_v1",
	version: 1,
	name: "Example: Allowed Activity",
	description: "This activity demonstrates aspects of how access can be restricted on an action, or an entire Activity.",
	
	//The set of states the Activity can occupy
	states: ['opened', 'closed', 'locked', 'unlocked'],
	
	//Creating the activity
	create: {
	    to: ['opened', 'locked']
	},
	
	//Activity-wide restrictions
	allowed: {
		//Only the creator or an adminsitrator can view this activity 
		read: ['creator', 'ebat_admin'], 
		//Only the creator can fire actions, unless the activity is in the 'unlocked' state.
		fire: function() {
			//Chicken-and-egg problem; no creator if the activity doesn't exist yet!
			if (this.activity.isNew()) return true;			
			//Check for an attribute on the activity
			else if (_.contains(this.activity.get('state'), 'unlocked')) return true;
			//Otherwise, must be a creator 
			else Allowed.buildRule('creator').call(this);
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
		//Add the 'unlocked' state - only fireable by the creator
		{  
			id: 'unlock',
			from: ['locked'],
			allowed: 'creator',
			to: ['unlocked']
		},
		//Remove the 'unlocked' state - only fireable by the creator
		{
			id: 'lock',
			from: ['unlocked'],
			allowed: 'creator',
			to: ['locked']					
		}
    ]
};