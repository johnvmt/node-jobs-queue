
function JobsQueue(passedOptions) {
	var defaultOptions = {
		maxSimultaneous: 1
	};

	this.options = Object.assign(defaultOptions, passedOptions)

	this.queuedJobList = []; // IndexedLinkedList();
	this.inprogressJobList = []; // IndexedLinkedList();

	this.inprogress = 0;
	this.queued = 0;
}

JobsQueue.prototype._tryStartNextJob = function() {
	if(this.queuedJobList.length > 0) {
		// Get max simultaneous jobs from jobs in progress, next job in queue, global max; take min of these to get max
		var globalMaxSimultaneous = maxFromOption(this.options.maxSimultaneous);

		var inprogressMaxSimultaneous = 0;
		this.inprogressJobList.forEach(function(job) {
			inprogressMaxSimultaneous = maxFromArray([inprogressMaxSimultaneous, job.options.maxSimultaneous]);
		});

		var nextJob = this.queuedJobList[0]; // peek
		var nextJobMaxSimultaneous = maxFromOption(nextJob.options.maxSimultaneous);

		var maxSimultaneous = maxFromArray([globalMaxSimultaneous, inprogressMaxSimultaneous, nextJobMaxSimultaneous]);

		if(maxSimultaneous <= 0 || this.inprogress < maxSimultaneous) { // Start the next job
			var job = this.queuedJobList.shift(); // Remove from the queued jobs list
			this.queued--;

			this.inprogressJobList.push(job); // Add to the jobs in progress list, with same ID
			this.inprogress++;

			this._startJob(job.jobId);

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

JobsQueue.prototype._startJob = function(jobId) {
	let job = this.inprogressJobList.find(j => j.jobId = jobId)
	if (job) {
		var jobRestarts = job.restarts;

		job.start(function() { // Start the job and pass in the callback to finish the job
			if(jobRestarts == job.restarts) // Check if job started was the last one
				job.controller.complete();
		});
	}
};

JobsQueue.prototype._finishJob = function(jobId) {
	let jobIndexP = this.inprogressJobList.findIndex(j => j.jobId === jobId)
	if (jobIndexP >= 0) {
		this.inprogressJobList.splice(jobIndexP, 1);
		this.inprogress--;
		this._tryStartNextJob();
		return;
	}
	let jobIndexQ = this.queuedJobList.findIndex(j => j.jobId === jobId)
	if (jobIndexQ >= 0) {
		this.queuedJobList.splice(jobIndexQ, 1);
		this.queued--;
		this._tryStartNextJob();
		return;
	}
	throw new Error('job_not_found');
};

JobsQueue.prototype.enqueue = function(callback, options) {
	var self = this;
	var jobId = this._uniqueId();

	var job = {
		jobId: jobId,
		start: callback, // Wrap function to ensure uniqueness when job finishes
		restarts: 0,
		options: Object.assign({}, options),
	}

	var jobController = {
		cancel: function() {
			self._finishJob(jobId);
		},
		complete: function() {
			self._finishJob(jobId);
		},
		restart: function(newCallback) {
			if(typeof newCallback == 'function')
				job.start = newCallback;
			job.restarts++;
			self._startJob(jobId); // Restart if already in progress
		}
	};

	job.controller = jobController;

	self.queuedJobList.push(job);

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
