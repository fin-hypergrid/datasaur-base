'use strict';

function DataSourceBase() {}

DataSourceBase.extend = require('extend-me');

DataSourceBase.prototype = {
    constructor: DataSourceBase.prototype.constructor,

    replaceIndent: '_',

    isNullObject: true,

    DataSourceError: DataSourceError,

    get schema() {
        if (this.dataSource) {
            return this.dataSource.schema;
        }
    },
    getProperty: function getProperty(propName) {
        if (propName in this) {
            return this[propName];
        }

        if (this.dataSource) {
            return getProperty.call(this.dataSource, propName);
        }
    },
    apply: function() {
        throw new DataSourceError('Nothing to apply.');
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
    setValue: function() {
        if (this.dataSource) {
            return this.dataSource.setValue.apply(this.dataSource, arguments);
        }
    },
    getRowCount: function() {
        if (this.dataSource) {
            return this.dataSource.getRowCount.apply(this.dataSource, arguments);
        }
    },
    getColumnCount: function() {
        if (this.dataSource) {
            return this.dataSource.getColumnCount.apply(this.dataSource, arguments);
        }
    },
    getGrandTotals: function() {
        //row: Ideally this should be set and get bottom/top totals
        //Currently this function is just sending the same for both in aggregations
        if (this.dataSource) {
            return this.dataSource.getGrandTotals.apply(this.dataSource, arguments);
        }
    },
    setData: function() {
        if (this.dataSource) {
            return this.dataSource.setData.apply(this.dataSource, arguments);
        }
    },
    click: function() {
        if (this.dataSource) {
            return this.dataSource.click.apply(this.dataSource, arguments);
        }
    },
    isDrillDown: function() {
        if (this.dataSource) {
            return this.dataSource.isDrillDown.apply(this.dataSource, arguments);
        }
    },
    viewMakesSense: function() {
        if (this.dataSource) {
            return this.dataSource.viewMakesSense.apply(this.dataSource, arguments);
        }
    },

    /**
     * Get new object with name and index given the name or the index.
     * @param {string|number} [column] - Column name or index.
     * @param {string} [defaultName] - Name to use when column is omitted or undefined. May be omitted when column is definitely defined.
     * @returns {{name: string, index: number}}
     */
    getColumnInfo: function(column, defaultName) {
        var name, index;
        if (column === undefined) {
            column = defaultName;
        }
        if (typeof column === 'number') {
            name = this.getFields()[index = column];
        } else {
            index = this.getFields().indexOf(name = column);
        }
        if (name && index >= 0) {
            return {
                name: name,
                index: index
            };
        }
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
        var fields = this.schema ? this.schema.map(function(cs) { return cs.name; }) : this.getHeaders();
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

function DataSourceError(message) {
    this.message = message;
}

// extend from `Error`
DataSourceError.prototype = Object.create(Error.prototype);

// override error name displayed in console
DataSourceError.prototype.name = 'DataSourceError';

module.exports = DataSourceBase;
