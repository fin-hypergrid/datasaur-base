'use strict';

var pubsubstar = require('pubsubstar');

var REGEX_HYPHENATION = /[-_]\w/g;

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

    initialize: function(dataSource) {
        this.dataSource = dataSource;
    },

    append: function(DataSource) {
        return new DataSource(this);
    },


    // "SET" METHODS (ALWAYS HAVE ARGS)

    setSchema: function() {
        if (this.dataSource) {
            return this.dataSource.setSchema.apply(this.dataSource, arguments);
        }
    },

    setData: function() {
        if (this.dataSource) {
            return this.dataSource.setData.apply(this.dataSource, arguments);
        }
    },

    setValue: function() {
        if (this.dataSource) {
            return this.dataSource.setValue.apply(this.dataSource, arguments);
        }
    },


    // "GET" METHODS WITHOUT ARGS

    getSchema: function() {
        if (this.dataSource) {
            return this.dataSource.getSchema();
        }
    },

    getRowCount: function() {
        if (this.dataSource) {
            return this.dataSource.getRowCount();
        }
    },

    getColumnCount: function() {
        if (this.dataSource) {
            return this.dataSource.getColumnCount();
        }
    },

    getGrandTotals: function() {
        //row: Ideally this should be set and get bottom/top totals
        //Currently this function is just sending the same for both in aggregations
        if (this.dataSource) {
            return this.dataSource.getGrandTotals();
        }
    },


    // "GET" METHODS WITH ARGS

    getProperty: function getProperty(propName) {
        if (propName in this) {
            return this[propName];
        }

        if (this.dataSource) {
            return getProperty.call(this.dataSource, propName);
        }
    },

    getDataIndex: function() {
        if (this.dataSource) {
            return this.dataSource.getDataIndex.apply(this.dataSource, arguments);
        }
    },

    getRow: function() {
        if (this.dataSource) {
            return this.dataSource.getRow.apply(this.dataSource, arguments);
        }
    },

    findRow: function() {
        if (this.dataSource) {
            return this.dataSource.findRow.apply(this.dataSource, arguments);
        }
    },

    revealRow: function() {
        if (this.dataSource) {
            return this.dataSource.revealRow.apply(this.dataSource, arguments);
        }
    },

    getValue: function() {
        if (this.dataSource) {
            return this.dataSource.getValue.apply(this.dataSource, arguments);
        }
    },

    click: function() {
        if (this.dataSource) {
            return this.dataSource.click.apply(this.dataSource, arguments);
        }
    },


    // BOOLEAN METHODS

    isDrillDown: function(colIndex) {
        if (this.dataSource) {
            return this.dataSource.isDrillDown(colIndex);
        }
    },

    isDrillDownCol: function(colIndex) {
        if (this.dataSource) {
            return this.dataSource.isDrillDownCol(colIndex);
        }
    },

    isLeafNode: function(y) {
        if (this.dataSource) {
            return this.dataSource.isLeafNode(y);
        }
    },

    viewMakesSense: function() {
        if (this.dataSource) {
            return this.dataSource.viewMakesSense();
        }
    },


    // PUB-SUB

    subscribe: pubsubstar.subscribe,

    unsubscribe: pubsubstar.unsubscribe,

    /**
     * For each data source:
     * 1. Look for a method with name `topic` (hyphenated topic names are translated to camelCase).
     * 2. If found, call it directly and return `[result]`.
     * 3. If not found, look in next data source.
     * 4. If never found, return `[]`.
     * @param {string} topic - Topic string, typically hyphenated.
     * @param {*} [message]
     * @returns {*[]} Empty array means not handled; otherwise [0] contains handler response (may be `undefined`).
     */
    publish: function(topic, message) {
        var methodName = topic.replace(REGEX_HYPHENATION, toCamelCase),
            loopMethod = 'find',
            pipes = [],
            results = [];

        if (!(typeof topic === 'string')) {
            throw new TypeError('DataSourceBase#publish accepts string topics only.');
        }

        if (topic.indexOf('*') >= 0) {
            throw new TypeError('DataSourceBase#publish does not accept wildcard topics.');
        }

        for (var pipe = this; pipe.dataSource; pipe = pipe.dataSource) {
            pipes.push(pipe);
        }
        pipes.push(pipe);

        // apply is a special case
        if (topic === 'apply') {
            pipes.reverse();
            loopMethod = 'forEach';
        }

        // find data source to handle topic
        pipes[loopMethod](function(dataSource) {
            if (typeof dataSource[methodName] === 'function') {
                results.push(dataSource[methodName](message));
                return true; // found
            }
        });

        return results;
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

function toCamelCase(hyphenAndNextChar) {
    return hyphenAndNextChar[1].toUpperCase();
}

function DataSourceError(message) {
    this.message = message;
}

// extend from `Error`
DataSourceError.prototype = Object.create(Error.prototype);

// override error name displayed in console
DataSourceError.prototype.name = 'DataSourceError';

module.exports = DataSourceBase;
