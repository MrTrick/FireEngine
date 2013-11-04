# Handlers #

The basic concept of Designs, Activities and Actions is made customisable through Handlers.

Each Action may have an `allowed` handler, a `prep` handler and/or a `fire` handler.

* A handler is defined as a Javascript function;
  * Takes no arguments; `function() { ... }`
  * Is executed within a special scope, `context`.
  * Has access to certain data, depending on handler type.

For example, an *'approve'* action:

    {
		'id': 'approve',
		'from': ['submitted'],
		'to': ['approved'],
    	'allowed': function() { 
			return _.contains(user.id, roles.approvers); 
		},
		'prepare': function() {
			//TBD: Something about bootbox here
		},
		'fire': function() {
			//TBD: Something about emailing here
		}
    }


## Handler: Allowed ##

The `allowed` handler restricts the ability to fire the enclosing Action.

* **Default**: 
   * If not set, the default will allow the Action.
* **Behaviour**: 
   * Called synchronously.
   * Implementations return **true** to allow the firing, **false** to disallow it.
* **Environment:** 
   * Client AND Server
* **Context:**
   * TBD

## Handler: Prepare ##

The `prepare` handler allows the Action to gather information from the User before firing. This could be through a form, or picker, or buttons. It could also be used to require a confirmation step before firing.

The gathered information is sent to the server, for the `fire` handler to process.

* **Definitions:**
	* `input`: Information collected by the `prepare` handler
* **Default:**
	* If not set, the Action is simply fired immediately with `input = {}`.
* **Behaviour:**
    * Called asynchronously, if `allowed` returns true.
    * Implementations call `complete(input);` or trigger the Action's `prep:complete` event, passing `input`.
* **Environment:**
    * Client ONLY
* **Context:**
    * TBD

TBD: Add more about complete / cancel / error

## Handler: Fire ##

When the Action is fired on the server, the `fire` handler can be used to customise the behaviour of the Action, and modify the Activity. The `fire` handler is the only mechanism for modifying Activities.

* **Default:**
	* If not set, the Action transitions the Activity to the defined `to` state, adding the default `history` message. 
	* Any `input` data is ignored.
* **Behaviour:**
    * Called asynchronously, if `allowed` returns true.
	* If not completed within a site-configurable timeout period, the transition will fail.
	* Implementations call `complete([data]);` or trigger the Action`s `fire:complete` event.
	* The `fire` handler may modify these scoped variables to have them saved to the Activity:
		* **\_id** : Optionally set (`create` only) to specify the Activity's id. Must be unique.
		* **data** : The Activity's data. 
		* **roles** : User roles associated with the Activity. (eg; 'creator':['jsmith'])
		* **links** : The links associated with the Activity.
		* **to** : Optionally modify the Action's defined `to` states.
		* **message** : Optionally override the default history message.
	* The `fire` handler should not attempt to modify any other scoped variables.
* **Environment.**
	* Server ONLY
* **Context:**
 	* TBD