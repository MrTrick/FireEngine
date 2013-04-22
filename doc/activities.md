# Activity

An Activity represents an instance of some process or procedure that is started, in progress, cyclic or completed.

## Structure

An Activity is stored as an object containing;

 * [_id](#activity._id)
 * [_rev](#activity._rev)
 * [design](#activity.design)
 * [state](#activity.state)
 * [data](#activity.data)
 * [roles](#activity.roles)
 * [links](#activity.links)
 * [history](#activity.history)

The only way to modify an activity is through the `actions` defined in the Activity's `design`.
This can be customised through the use of action [fire handlers](handlers.md#fire).

### <a id="activity._id"></a>_id
 * The Activity's unique identifier.
 * Will be automatically set 
 * Can be set by the create:fire handler (though will fail to save if the id already exists)
 * **Type:** String, `[a-z0-9_]+`
 * **Mutability:** Readonly once the Activity is created.

### <a id="activity._rev"></a>_rev
 * Internal couchdb property.  
 * **Mutability:** Readonly.

### <a id="activity.design"></a>design
 * Either the design object or the id of the design object.
 * Defines the entire behaviour of the Activity.
 * See [design](design.md) for further information
 * **Type:** Design Object, or Design id (String) TBD: Add design id loading support
 * **Mutability:** Readonly, usually.

### <a id="activity.state"></a>state
 * The stored current states of the Activity.
 * Will be a strict subset of the Design's state list.
 * The state "closed" is treated magically - if the activity has the state "closed" it will be considered closed. (TBD)
 * **Type:** Array of valid states
 * **Mutability:** Readonly, but the `to` states in a transition can be customised. 

### <a id="activity.data"></a>data
 * Arbitrary data belonging to the Activity.
 * **Type:** Object
 * **Mutability:** Arbitrarily modifiable.

### <a id="activity.roles"></a>roles
 * User ids by their role on the Activity.
 * The `creator` role will automatically be set. (TBD)
 * **Type:** Object, properties are *Key:*Role name, *Value:*Array of user ids.
 * **Mutability:** Arbitrarily modifiable.

### <a id="activity.links"></a>links
 * Any external documents related to the Activity.
 * Each property may be a single id, or an array of ids.
 * The `parent` property, if set, is treated as a link to an Activity.
 * The `child` property, if set, is treated as a link to Activities.
 * **Type:** Object, properties are *Key:*Document name, *Value:* String id, or Array of String ids
 * **Mutability:** Arbitrarily modifiable.

### <a id="activity.history"></a>history
 * A record of all actions fired on the Activity, and by whom.
 * The history element is automatically set by the firing process.
 * **Type:** Array of History objects, containing `who`, `when`, `action`, `message`.
 * **Mutability:** Readonly, but the `message` for the action can be customised on fire.
