# Action

1. Activities are modified by Actions. Activities are *only* modified by actions.
2. To execute an Action is to `fire` it.
3. Actions follow a simple process;
   * On the client: Firing an action
      * Checked to ensure the Action can be fired; with `allowed`
      * Gathering `inputs` data and whatever preparation is needed; with `prepare`.
      * Sent back to the server with `fire` (client context), attaching any `input` data.
   * On the server: Firing an action
      * Checked to ensure the Action can be fired; with `allowed`
      * Executes the Action; with `fire`, attaching any `input` data.
4. When firing; Actions may:
   * Specify the new `states` to which the Activity transitions. 
   * Choose the message to be recorded about the action.
   * Arbitrarily modify the internal `attributes` of the Activity.
   * Make modifications to external systems, as far as allowed by the Action `context`.
5. Actions may be fired by other Actions.
6. Actions may be fired by an automatic process, according to `when`.
-----------------------------------------------------------------------------------------   
## Structure

An Action is encoded as an object containing;

 * [id](#action.id)
 * [name](#action.name)
 * [from](#action.from)
 * [to](#action.to)
 * [allowed](#action.allowed_handler)
 * [prepare](#action.prepare_handler)
 * [fire](#action.fire_handler)
 
The Action may contain other properties. 

### id ### {#action.id}
* The Action's unique identifier.
* Type: String, `[a-z0-9_]+`
* Required.

### name ### {#action.name}
* The human-readable name of the Action, used for display.
* Type: String.
* Optional. If omitted, use the pretty-formatted `id` instead.

### from ### {#action.from}
* The states this action consumes.
* Array of states. Each must be listed in the `design.states` attribute.
* For `allowed` to succeed, current `activity.state` must contain all `from` states.
* On firing, `from` is subtracted from `activity.state`.
* Optional. If omitted, is empty. (and Action can be fired in any state)

### to ### {#action.to}
* The states this action produces.
* Array of states. Each must be listed in the `design.states` attribute.
* On firing, `to` is added to `activity.state`.
* Optional. If omitted, is empty. On firing, do not add any further states. (dead-end?)

### allowed ### {#action.allowed_handler}
* A custom `allowed` handler.
* Function. Executes within the configured [context]{#context}.
* Allows __additional__ conditions to be set beyond the `from` conditions.
* Called synchronously, on client AND server. Returns `true` to allow, `false` to deny.
* Cannot override where `from` is not valid.
* Optional. If omitted, allowed.

### prepare ### {#action.prepare_handler}
* A custom `prepare` handler.
* Function. Executes within the configured [context]{#context}.
* Allows __additional__ information or confirmation to be provided from the user before firing.
* Called asynchronously, on client. Calls `this.success( input_data )`
* On error or cancel?  ...TBD
* Optional. If omitted, succeeds immediately with no data.

### fire ### {#action.fire_handler}
* A custom `fire` handler.
* Function. Executes within the configured [context]{#context}.
* Allows arbitrary execution of logic during the firing of an action.
* Allows modification of the Activity's internal `data`.
* Allows the `to` states and `message` to be overriden.  
* Optional. If omitted, succeeds immediately with no overrides. 

-----------------------------------------------------------------------------------------