# Jobs Queue #
Queue of tasks, with optional simultaneous jobs set at a module and/or job level

## Usage ##

	var jobQueue = require('jobs-queue')({maxSimultaneous: 2});
    
    jobQueue.enqueue(function(done) {
    	console.log("1-start");
    	setTimeout(function() {
    		console.log("1-complete");
    		done();
    	}, 1000);
    }, {maxSimultaneous: 1});
    
    jobQueue.enqueue(function(done) {
    	console.log("2-start");
    	setTimeout(function() {
    		console.log("2-complete");
    		done();
    	}, 1000);
    }, {maxSimultaneous: 2});
    
    jobQueue.enqueue(function(done) {
    	console.log("3-start");
    	setTimeout(function() {
    		console.log("3-complete");
    		done();
    	}, 1000);
    }, {maxSimultaneous: 2});