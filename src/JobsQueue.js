import Promise from "bluebird";
import EventEmitter from "events";
import FastPriorityQueue from "fastpriorityqueue";

class JobsQueue extends EventEmitter {
	constructor() {
		super();

		Promise.config({
			cancellation: true
		});

		this.queued = new FastPriorityQueue((a, b) => a.config.priority > b.config.priority);
		this.running = new Set();

		const startQueue = () => {
			if(this.queued.size !== queued) {
				queued = this.queued.size;
				this.emit('queued', queued);
			}

			if(this.running.size !== running) {
				running = this.running.size;
				this.emit('running', running);
			}

			if(this.running.size + this.queued.size !== requests) {
				requests = this.running.size + this.queued.size;
				this.emit('requests', requests);
			}

			this.startNext();
		}

		this.on('start', startQueue);
		this.on('end', startQueue);
		this.on('enqueue', startQueue);
		this.on('cancel', startQueue);

		let queued = 0;
		let running = 0;
		let requests = 0;
	}

	async startNext() {
		if(this.queued.size > 0) {
			let job = this.queued.peek();

			if(typeof job.config.startFilter !== 'function' || job.config.startFilter()) {
				this.queued.poll();
				this.queued.trim();
				this.running.add(job);

				try {
					this.emit('start', job);
					job.attempts = this.attemptJobWithRetries(job);
					job.resolve(await job.attempts);
				}
				catch(error) {
					job.reject(error);
				}
				finally {
					this.running.delete(job);
					this.emit('end', job);
				}
			}
		}
	}

	attemptJobWithRetries(job) {
		return this.attemptJobOnce(job).catch((error) => {
			if(typeof job.config.retryFilter === 'function' && job.config.retryFilter(error))
				return this.attemptJobWithRetries(job);
			else
				throw error;
		});
	}

	attemptJobOnce(job) {
		return new Promise(async (resolve, reject, onCancel) => {
			try {
				let startResult = job.config.start();
				if(startResult instanceof Promise) {
					const jobTimeout = (typeof job.config.timeout === 'number' && job.config.timeout > 0) ? setTimeout(() => {
						reject(new Error('timeout'));
					}, job.config.timeout) : null;

					onCancel(() => {
						if(typeof startResult.cancel === 'function') {
							try {
								startResult.cancel();
							}
							catch(error) {
								this.emit('error', error);
							}
						}
					});

					startResult.then(resolve).catch(reject).finally(() => {
						if(jobTimeout !== null)
							clearTimeout(jobTimeout);
					});
				}
				else
					resolve(startResult);
			}
			catch(error) {
				reject(error);
			}
		});
	}

	enqueue(jobConfig) {
		// return a cancelable promise
		return new Promise((resolve, reject, onCancel) => {
			const job = {
				config: {
					priority: 0,
					...jobConfig
				},
				resolve: resolve,
				reject: reject
			};

			this.queued.add(job);
			this.emit('enqueue', job);

			onCancel(() => {
				if(this.running.has(job)) {
					job.attempts.cancel();
					this.running.delete(job);
				}
				else if(this.queued.remove(job))
					this.emit('cancel', job);
			});
		});
	}

	async destroy() {
		this.removeEvent();
	}
}

export default JobsQueue;
