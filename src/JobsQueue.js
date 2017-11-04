var IndexedLinkedList = require('./IndexedLinkedList');

function JobsQueue(passedOptions) {
	var defaultOptions = {
		maxSimultaneous: 1
	};

	this.options = this._objectMerge(defaultOptions, passedOptions)

	this.queuedJobList = IndexedLinkedList();
	this.inprogressJobList = IndexedLinkedList();

	this.inprogress = 0;
	this.queued = 0;
}

JobsQueue.prototype._tryStartNextJob = function() {
	if(this.queuedJobList.length) {
		// Get max simultaneous jobs from jobs in progress, next job in queue, global max; take min of these to get max
		var globalMaxSimultaneous = maxFromOption(this.options.maxSimultaneous);

		var inprogressMaxSimultaneous = 0;
		this.inprogressJobList.forEach(function(job) {
			inprogressMaxSimultaneous = maxFromArray([inprogressMaxSimultaneous, job.options.maxSimultaneous]);
		});

		var nextJob = this.queuedJobList.peek();
		var nextJobMaxSimultaneous = maxFromOption(nextJob.options.maxSimultaneous);

		var maxSimultaneous = maxFromArray([globalMaxSimultaneous, inprogressMaxSimultaneous, nextJobMaxSimultaneous]);

		if(maxSimultaneous <= 0 || this.inprogress < maxSimultaneous) { // Start the next job
			var job = this.queuedJobList.dequeue(); // Remove from the queued jobs list
			this.queued--;

			this.inprogressJobList.enqueue(job.jobId, job); // Add to the jobs in progress list, with same ID
			this.inprogress++;

			job.start(job.controller.complete); // Start the job and pass in the callback to finish the job
			this._tryStartNextJob(); // May be able to run jobs simultaneously
		}
	}

	function maxFromArray(maxList) {
		var limitedMaxList = maxList.filter(function(maxSimultaneous) {
			return maxFromOption(maxSimultaneous) > 0;
		});
		return (limitedMaxList.length > 0) ? Math.min.apply(null, limitedMaxList) : 0;
	}

	function maxFromOption(maxInProgress) {
		return (typeof maxInProgress == 'number' && maxInProgress > 0) ? maxInProgress : 0;
	}
};

JobsQueue.prototype._finishJob = function(jobId) {
	if(this.inprogressJobList.hasIndex(jobId)) {
		this.inprogressJobList.remove(jobId);
		this.inprogress--;
		this._tryStartNextJob();
	}
	else if(this.queuedJobList.hasIndex(jobId)) {
		this.queuedJobList.remove(jobId);
		this.queued--;
		this._tryStartNextJob();
	}
	else
		throw new Error('job_not_found');
};

JobsQueue.prototype.enqueue = function(callback, options) {
	var self = this;
	var jobId = this._uniqueId();
	var jobController = {
		cancel: function() {
			self._finishJob(jobId);
		},
		complete: function() {
			self._finishJob(jobId);
		}
	};

	self.queuedJobList.enqueue(jobId, {
		jobId: jobId,
		start: callback,
		options: self._objectMerge({}, options),
		controller: jobController
	});

	this.queued++;

	this._tryStartNextJob();

	return jobController;
};

JobsQueue.prototype._objectForEach = function(object, callback) {
	// run function on each property (child) of object
	var property;
	for(property in object) { // pull keys before looping through?
		if (object.hasOwnProperty(property))
			callback(object[property], property, object);
	}
};

JobsQueue.prototype._objectMerge = function() {
	var merged = {};
	this._objectForEach(arguments, function(argument) {
		for (var attrname in argument) {
			if(argument.hasOwnProperty(attrname))
				merged[attrname] = argument[attrname];
		}
	});
	return merged;
};

JobsQueue.prototype._uniqueId = function() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
};

module.exports = function(options) {
	return new JobsQueue(options);
};