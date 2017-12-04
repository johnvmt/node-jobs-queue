function IndexedLinkedList() {
	this.list = {};
	this.length = 0;
	this.head = null;
	this.tail = null;
}

/**
 * Peek at head, without removing it
 */
IndexedLinkedList.prototype.peek = function () {
	if(this.length > 0)
		return this.head.data;
	else
		throw new Error('list_empty');
};

/**
 * Get item with given index, if it exists
 */
IndexedLinkedList.prototype.get = function(index) {
	if(!this.hasIndex(index))
		throw new Error('index_undefined');
	else
		return this.list[index].data;
};

/**
 * Check if item with given index exists
 */
IndexedLinkedList.prototype.hasIndex = function(index) {
	return (typeof this.list[index] == 'object');
};

/**
 * Iterate over list, starting at head
 */
IndexedLinkedList.prototype.forEach = function(callback) {
	var item = this.head;
	while(item != null) {
		callback(item.data);
		item = item.next;
	}
};

/**
 * Remove from head
 */
IndexedLinkedList.prototype.dequeue = function() {
	return this._removeItem(this.head);
};

/**
 * Remove item at given index
 * @param index
 */
IndexedLinkedList.prototype.remove = function(index) {
	this._removeItem(this.list[index]);
};

/**
 * Add at head
 * @param index
 * @param data
 */
IndexedLinkedList.prototype.push = function(index, data) {
	var item = this._resetIndex(index, data);

	// Link it to the list
	if(this.head != null)
		this.head.prev = item;

	item.prev = null;
	item.next = this.head;

	this.head = item;

	if(this.length == 0)
		this.tail = item;

	// Change the list length
	this.length++;
};

/**
 * Add at tail
 * @param index
 * @param data
 */
IndexedLinkedList.prototype.enqueue = function(index, data) {
	var item = this._resetIndex(index, data);

	// Link it to the list
	if(this.tail != null)
		this.tail.next = item;

	item.next = null;
	item.prev = this.tail;

	this.tail = item;

	if(this.length == 0)
		this.head = item;

	// Change the list length
	this.length++;
};

/**
 * Unlink the item from the list, if it exists
 * @param index
 * @param data
 * @private
 */
IndexedLinkedList.prototype._resetIndex = function(index, data) {
	// Remove the item if it exists
	try {
		this.remove(index);
	}
	catch(error) {}

	// Add the item to the list
	return this._set(index, data);
};

/**
 * Set the data for an item; create the item if it doesn't exist
 * @param index
 * @param data
 * @private
 */
IndexedLinkedList.prototype._set = function(index, data) {
	if(typeof this.list[index] == 'object') // item already exists
		this.list[index].data = data;
	else {
		this.list[index] = {
			data: data,
			next: undefined,
			prev: undefined
		}
	}

	return this.list[index];
};

/**
 * Remove given item from the list
 * @param item
 * @returns {*|string|CanvasPixelArray|Object[]}
 * @private
 */
IndexedLinkedList.prototype._removeItem = function(item) {
	if(typeof item != 'object' || item == null)
		throw new Error('undefined_item');
	else {
		// Set next item's prev to current item's prev
		if(item.next == null) // item is at tail
			this.tail = item.prev;
		else // item is not at tail
			item.next.prev = item.prev;

		if(item.prev == null) // item is at head
			this.head = item.next;
		else // item is not at head
			item.prev.next = item.next;

		this.length--;
		return item.data;
	}
};

module.exports = function() {
	return new IndexedLinkedList();
};