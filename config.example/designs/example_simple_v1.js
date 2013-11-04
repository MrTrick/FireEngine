/**
 * This is the simplest kind of activity.
 * It implements two states - open and closed.
 * Its actions just transition from one state to the next.
 */
if (typeof module === "undefined") throw "Unexpected context - expected to be called from node.js";
module.exports = {
	//Basic information about the activity
	id: "example_simple_v1",
    version: 1,
	name: "Example: Simple Activity",
	description: "This is the simplest kind of useful activity, open or closed, with no special behaviour.",
	
	//The set of states the Activity can occupy
    states: ['opened', 'closed'],
    
    //Creating the activity
    create: {
        to: ['opened']
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
		}
    ]
};