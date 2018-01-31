'use strict';

function DataSourceBase() {}
DataSourceBase.extend = require('extend-me');
DataSourceBase.prototype = {
    constructor: DataSourceBase.prototype.constructor,

    $$CLASS_NAME: 'DataSourceBase',

    replaceIndent: '_',

    isNullObject: true,

    DataSourceError: DataSourceError,

    initialize: function(dataSource) {
        var bottomLayer = getBottomLayer(this),
            bubbleLayer = dataSource
                ? getBottomLayer(this.dataSource = dataSource) // reference private "bubble layer" previously injected
                : Object.create(DataSourceBase.prototype); // inject a private "bubble layer" beneath `this` data source's prototype

        if (bottomLayer !== bubbleLayer) {
            Object.setPrototypeOf(bottomLayer, bubbleLayer);
        }
    },

    /**
     * Allow methods to bubble (with optional fallback).
     * Note that `initialize` is ignored.
     * @param {object} [iface] - Bubble each included setter and/or getter or method, calling the fallback when not handled.
     * @param {string[]} [filter] - When defined, acts as a whitelist for items in `iface` (or a blacklist if `filter.blacklist` is truthy).
     * @returns {number} The number of items bubbled after filter out `initialize`, whitelist/blacklist, and non-methods.
     */
    setInterface: function(iface, filter) {
        var bubbled = 0;
        Object.getOwnPropertyNames(iface).forEach(function(key) {
            if (key === 'initialize') {
                return;
            }

            if (filter) {
                var listed = (filter.indexOf(key) >= 0);
                if (!(filter.blacklist ^ listed)) {
                    return;
                }
            }

            var descriptor = Object.getOwnPropertyDescriptor(iface, key);
            var newdesc = {};

            if (typeof descriptor.get === 'function') {
                newdesc.get = function() {
                    if (this.dataSource) {
                        return this.dataSource[key];
                    } else {
                        return descriptor.get();
                    }
                };
            }

            if (typeof descriptor.set === 'function') {
                newdesc.set = function(arg) {
                    if (this.dataSource) {
                        this.dataSource[key](arg);
                    } else {
                        descriptor.set(arg);
                    }
                };
            }

            if (typeof descriptor.value === 'function') {
                newdesc.value = function() {
                    if (this.dataSource) {
                        return this.dataSource[key].apply(this.dataSource, arguments);
                    } else {
                        return descriptor.value.apply(null, arguments);
                    }
                };
            }

            if (Object.keys(newdesc).length) {
                var bubbleLayer = getBottomLayer(this);

                // allow possible reconfig/removal later
                newdesc.enumerable = newdesc.writeable = newdesc.configurable = true;

                Object.defineProperty(bubbleLayer, key, newdesc);

                bubbled += 1;
            }
        }, this);
        return bubbled;
    },

    /**
     * @summary Get object that defines the method.
     * @dsc Searches the data source for the object that owns the named method.
     *
     * This will be somewhere in the prototype chain of the data source.
     * Searches each member of the data source pipeline from tip to base.
     *
     * Useful for overriding or deleting a method.
     * @param string {methodName}
     * @returns {object|undefined} The object that owns the found method or `undefined` if not found.
     */
    getOwnerOf: function(methodName) {
        for (var dataSource = this; dataSource; dataSource = dataSource.dataSource) {
            if (typeof dataSource[methodName] === 'function') {
                for (var object = dataSource; object; object = Object.getPrototypeOf(object)) {
                    if (object.hasOwnProperty(methodName)) {
                        return object;
                    }
                }
            }
        }
    },


    // DEBUGGING AIDS

    /**
     * Get new object with name and index given the name or the index.
     * @param {string|number} columnOrIndex - Column name or index.
     * @returns {{name: string, index: number}}
     */
    getColumnInfo: function(columnOrIndex) {
        var name, index, result,
            schema = this.getSchema();

        if (typeof columnOrIndex === 'number') {
            index = columnOrIndex;
            name = schema[index].name;
        } else {
            name = columnOrIndex;
            index = schema.findIndex(function(columnSchema) {
                return columnSchema.name === name;
            });
        }

        if (name && index >= 0) {
            result = {
                name: name,
                index: index
            };
        }

        return result;
    },

    fixIndentForTableDisplay: function(string) {
        var count = string.search(/\S/);
        var end = string.substring(count);
        var result = Array(count + 1).join(this.replaceIndent) + end;
        return result;
    },

    dump: function(max) {
        max = Math.min(this.getRowCount(), max || Math.max(100, this.getRowCount()));
        var data = [];
        var schema = this.getSchema();
        var fields = schema ? schema.map(function(cs) { return cs.name; }) : this.getHeaders();
        var cCount = this.getColumnCount();
        var viewMakesSense = this.viewMakesSense;
        for (var r = 0; r < max; r++) {
            var row = {};
            for (var c = 0; c < cCount; c++) {
                var val = this.getValue(c, r);
                if (c === 0 && viewMakesSense) {
                    val = this.fixIndentForTableDisplay(val);
                }
                row[fields[c]] = val;
            }
            data[r] = row;
        }
        console.table(data);
    }
};

// Get the oldest ancestor class (prototype) younger than DataSourceBase (or Object)
function getBottomLayer(prototype) {
    do {
        var descendant = prototype;
        var prototype = Object.getPrototypeOf(descendant);
    }
        while (prototype !== DataSourceBase.prototype);

    return descendant;
}

function failSilently() {}


function DataSourceError(message) {
    this.message = message;
}

// extend from `Error`
DataSourceError.prototype = Object.create(Error.prototype);

// override error name displayed in console
DataSourceError.prototype.name = 'DataSourceError';

module.exports = DataSourceBase;
