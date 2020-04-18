# Jobs Queue
Queue of tasks, with options to cancel and retry

## Usage

### Initialize

    import JobsQueue from "jobs-queue";
    
    const jobsQueue = new JobsQueue();
    
### Enqueue a job

    const jobPromise = jobsQueue.enqueue({
        start: () => {
            // run the job
            // return a promise
        },
        startFilter: () => {
            // return true if job should start, false otherwise

            // eg: to only allow 2 concurrent running jobs:
            // return jobsQueue.running.size < 2
        },
        retryFilter: (error) => {
            // if job fails, optionally retry
            // return true to retry, false to abandon
        },
        timeout: <optional timout in ms> // job will fail if it lasts longer than this from the time it starts
    }).finally(() => {
        // do something when the job ends (in success or failure)
    });

### Get number of jobs running

    jobsQueue.running.size
    
### Get number of jobs queued

    jobsQueue.queued.size

### Destroy the queue (cancel all pending jobs)

    await jobsQueue.destroy();

### Events

#### On number of jobs in queue change

    jobsQueue.on('queued', (queuedJobs) => {
        
    });

#### On number of jobs running change

    jobsQueue.on('running', (runningJobs) => {
        
    });

#### On total number of jobs (queued + running) change

    jobsQueue.on('requests', (totalJobs) => {
        
    });

#### On error

    jobsQueue.on('error', (error) => {
        
    });


## Example ##

    import JobsQueue from "jobs-queue";
    
    const jobsQueue = new JobsQueue();
    
    const maxAttempts = 3;
    const pendingPromises = new Map();
    for(let i = 0; i < 10; i++) {
    
    	let attempts = 0;
    	const jobPromise = jobsQueue.enqueue({
    		start: () => {
    			return new Promise(async (resolve, reject) => {
    				// wait for 1 second
    				await sleep(1000);
    				if(Math.random() > 0.5) {
    					console.log(`The roulette has determined job ${i+1}'s attempt # ${attempts + 1} will succeed`);
    					resolve('success value');
    				}
    				else {
    					console.log(`The roulette has determined job ${i+1}'s attempt # ${attempts + 1} will fail`);
    					reject('failure value');
    				}
    
    			});
    			// run the job
    			// return a promise
    		},
    		startFilter: () => {
    			// only allow 2 jobs at the same time
    			return jobsQueue.running.size < 2
    		},
    		retryFilter: (error) => {
    			return attempts < maxAttempts
    		},
    		timeout: 2000
    	}).finally((val) => {
    		console.log(`Job ${i+1} finished`);
    		pendingPromises.delete(i);
    		// do something when the job ends (in success or failure)
    	});
    
    	jobPromise.then((val) => {
    		console.log(`Job ${i+1} finished with success ${val}`);
    	});
    
    	jobPromise.error((val) => {
    		console.log(`Job ${i+1} finished with error ${val}`);
    	});
    
    	pendingPromises.set(i, jobPromise);
    
    }
    
    jobsQueue.on('queued', (queuedJobs) => {
    	console.log("Queued", queuedJobs);
    });
    
    jobsQueue.on('running', (runningJobs) => {
    	console.log("Running", runningJobs);
    });
    
    jobsQueue.on('requests', (totalJobs) => {
    	console.log("Requests", totalJobs);
    });
    
    jobsQueue.on('error', (error) => {
    	console.log("Error", error);
    });
    
    function sleep(ms) {
    	return new Promise(resolve => setTimeout(resolve, ms));
    }

