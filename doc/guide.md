# Guide

## Intalling

1. Create a new couchdb database. eg; `http://localhost:5984/fireengine`

1. Checkout the repository to a local folder. eg; `/var/www/FireEngine`

1. Install the node dependencies. `npm install .`

1. Upload the design document into the couchdb database;

  1. Install the couchapp module  
     `sudo npm install couchapp -g`
  1. Push the couchapp definition  
     eg; `couchapp push ./couchapp/couchapp.js http://ADMINUSER:PASSWORD@localhost:5984/fireengine`

1. Create a symlink to the `./gui` folder from within the web server  
   eg; `ln -s /var/www/FireEngine/gui /var/www/html/FireEngine`

1. Copy the `config.example` folder to `config`;  
   `cp -r ./config.example ./config`  
   *(Alternatively, set FE\_CONFIG\_PATH)*

1. Open `./config/settings.js` and configure the database connection and other desired settings.

1. Copy the `gui/settings.example.js` file to `gui/settings` and configure the server connection.

1. Customise and create the designs in `config/designs` as required.
 
1. Start the server with `node app.js` or `always app.js`

1. Open the gui page to interact with the FireEngine system.

## Creating a new Design

A Design dictates the behaviour of Activities associated with that Design.

### Storage & Definition
Designs are stored in FireEngine as node modules.
This means that a design can be generated and exported at run-time, as long as the exported object only consists of data and self-contained functions.

A simple design module file looks like:
    
    /**
     * My design!
     * Author: Joe Bloggs
     */
    if (typeof module !== "object") throw "Unexpected context - expected to be called from node.js";
    module.exports = {
       ...design goes here...
    }

For maintainability, the file **should** have the same name as the design id.
From this point, only the design itself *(the exported object)* will be discussed.

### Creating Designs

#### Basic Design ####

Here is a design definition for a simple two-state Activity;

	//Design definition
    {
      id: 'basic_v1',
	  name: 'Basic Design',
      version: 1,
      states: ['opened', 'closed'],
      create: {
        to: ['opened']
      },
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
    }

A design definition needs, at a minimum;

* id - *A unique identifier, may contain `[a-z0-9_]`*
* version - *A numeric version indicator - start at `1`*
* states - *A list of states the Activity could occupy*
* create - *An Action fired when the Activity is created*
 * The `create` action **must** define some `to` states. These define the initial state of the Activity.
* actions - *An array of Actions that may be fired on the Activity*

Activities are modified by firing Actions. The basic Design above has two; `open` and `close`.

#### Activity: States ####

An Activity exists at a point in time in a subset of the Design's `states` set.  
*An Activity can be in more than one state at a time.*

**NOTE:** The state `closed` is a special state;

 * If an Activity is in the `closed` state, it will be considered closed.
 * The Activity can have other states and still be closed. eg; `["closed", "approved"]`
 * Closed Activities are not displayed in the `active` Activities view.
 * If the Activity has the `closed` state removed, it is no longer considered closed.
 
#### Actions: From / To ####

The `from` and `to` attributes within each Action define how the Activity moves between states.

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


 * The `from` attribute defines which states will be removed when the Action fires.
   * The Activity must occupy all the `from` states for that Action to be allowed to fire.
   * Given the Actions above, the `close` Action can only be fired while the Activity has the `opened` state.
 * The `to` attribute defines which states will be added when the Action fires.  
     **NOTE:** A `fire` handler function may override the `to` states.

Both `from` and `to` are optional. An activity design may have the following Actions:

    actions: [
      ...
      { id: 'do_nothing' },
      { id: 'add_foo', to: ['foo'] },
      { id: 'drop_foo', from: ['foo'] },
      ...
    ]

 * The `do_nothing` Action can be fired from any state, and will leave the Activity's states unchanged.
 * The `add_foo` Action can be fired from any state, and will add the `foo` state to the Activity.
 * The `drop_foo` Action can only be fired if the Activity has the `foo` state, and removes it from the Activity.

If an Action's `from` and `to` attributes contain common states, it can only be fired from those states but will not modify them.

#### Actions: Allowed ####

Sometimes Actions need to be restricted, beyond the `from` state requirement.  
These additional checks can be performed by an `allowed` Action attribute.  
eg;

 * Only fireable if the Activity data has certain values
 * Only fireable by certain users or roles

The `allowed` attribute can be a set of roles;

 * `"admin"` - Only fireable by a user who is an administrator.
 * `["admin", "creator"]` - Only fireable by a user who is either an administrator or the creator of the Activity
 * `{all: ["student", "staff"]` - Only fireable by a user who is both a student and a staff member.

The `allowed` attribute can be a handler function. It must execute synchronously, and return `true` to allow or `false` to disallow.

    { 
      id: 'withdraw', 
      from: ['submitted'],
      to: ['withdrawn'],
      allowed: function() {
		//The user must be the Activity's creator
        if (user.roles(activity).indexOf('creator') == -1) return false;

        //And it can't have been submited more than 24 hours ago
		var submit_date = Date.parse(data.submit_date);
        else if ( !submit_date || Date.now() - submit_date > 86400000 ) return false;

        else return true;
      }
    }

This Action can be fired if;

 * The Activity is in the `submitted` state *(From the `from` attribute)*, AND
 * The User has the 'creator' role on the Activity, AND
 * The Activity data attribute `submit_date` is less than 24 hours prior to the current Date.

----

More documentation TBD