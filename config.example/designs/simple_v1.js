/**
 * 
 */
if (typeof module === "undefined") throw "Unexpected context - expected to be called from node.js";
module.exports = {
	//Basic information about the activity
	id: "simple_v1",
    version: 1,
	name: "Simple Activity",
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