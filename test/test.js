/**
 * 
 */

exports.stuff = {
	testSomething: function(test){
		test.expect(1);
		test.ok(true, "this assertion should pass");
		test.done();
	},

	/*testSomethingElse: function(test){
		test.ok(false, "this assertion should fail");
		test.done();
	},*/
	
	testElseAgain: function(test){
		console.log(this);
		
		test.ok(true, "this assertion should pass");
		test.done();
	},
	
	setUp: function(callback) { this.foo = "Test"; console.log("stuff; UP!"); callback(); },
	tearDown: function(callback) { console.log("stuff; DOWN!"); callback(); }
};

exports.setUp = function(callback) { console.log("global; UP!"); callback(); };
exports.tearDown = function(callback) { console.log("global; DOWN!"); callback(); };

exports.blah = function(test){
	test.ok(true, "this assertion should pass");
	test.done();
};

console.log(this);