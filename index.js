'use strict';

function DataSourceBase() {}
DataSourceBase.extend = require('extend-me');
DataSourceBase.prototype = {
    constructor: DataSourceBase.prototype.constructor,

    replaceIndent: '_',

    isNullObject: true,

    drillDownCharMap: {
        OPEN: '\u25bc', // BLACK DOWN-POINTING TRIANGLE aka '▼'
        CLOSE: '\u25b6', // BLACK RIGHT-POINTING TRIANGLE aka '▶'
        undefined: '' // for leaf rows
    },

    DataSourceError: DataSourceError,

    initialize: function(data, schema, options) {
        this.permit(options && options.fallbacks);
    },

    /**
     * Allow methods to bubble (with optional fallback).
     * @param {object|undefined} [fallbacks] - Hash with method:fallback members. If omitted this call is a no-op.
     */
    permit: function(fallbacks) {
        if (fallbacks) {
            Object.keys(fallbacks).forEach(function(key) {
                allowToBubble(key, fallbacks[key]);
            });
        }
    },

    /**
     * @summary Append a new "pipe" for the data source.
     * @desc The new object becomes the tip of the data source.
     * @param DataSourcePipe
     * @returns {DataSource}
     */
    append: function(DataSourcePipe) {
        var newTip = new DataSourcePipe();
        newTip.dataSource = this;
        return newTip;
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

/**
 * Install a bubbler.
 * @param {string} [name] -- no-op if omitted
 * @param {interfaceExtender} [fallback] - One of:
 * * function - An explicit fallback implementation.
 * * `-Infinity` - No fallback; fail silently.
 * * `Infinity` - No fallback; throw error.
 * * otherwise - Generate a fallback function that issues a one-time "unsupported" warning and returns this value (typically `undefined` but could be anything).
 */
function allowToBubble(methodName, fallback) {
    if (!methodName) {
        return;
    }

    switch (fallback) {
        case -Infinity:
            fallback = undefined;
            break;
        case Infinity:
            fallback = unimplementedError.bind(null, methodName);
            break;
        default:
            if (typeof fallback !== 'function') {
                fallback = unsupportedWarning.bind(null, methodName, fallback);
            }
    }

    // Implementation note: Cannot return a bound function here instead of depending on the closure because its `this` needs to respect its execution context.
    DataSourceBase.prototype[methodName] = function() {
        if (this.dataSource) {
            return this.dataSource[methodName].apply(this.dataSource, arguments);
        } else if (fallback) {
            return fallback.apply(null, arguments);
        }
    };
}

var warned = {};

function unsupportedWarning(methodName, returnValue) {
    if (!warned[methodName]) {
        console.warn('Data source does not support `' + methodName + '()`.');
        warned[methodName] = true;
    }
    return returnValue;
}

function unimplementedError(methodName) {
    throw new DataSourceError('Expected data source to implement method `' + methodName + '()`.');
}

function DataSourceError(message) {
    this.message = message;
}

// extend from `Error`
DataSourceError.prototype = Object.create(Error.prototype);

// override error name displayed in console
DataSourceError.prototype.name = 'DataSourceError';

module.exports = DataSourceBase;
