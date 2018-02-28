'use strict';

function DataSourceBase() {}

DataSourceBase.extend = require('extend-me'); // make `extend`-able

DataSourceBase.prototype = {
    constructor: DataSourceBase.prototype.constructor,

    $$CLASS_NAME: 'DataSourceBase',

    isNullObject: true,

    drillDownCharMap: {
        true: '\u25bc', // BLACK DOWN-POINTING TRIANGLE aka '▼'
        false: '\u25b6', // BLACK RIGHT-POINTING TRIANGLE aka '▶'
        undefined: '', // leaf rows have no control glyph
        null: '   ' // indent
    },

    DataSourceError: DataSourceError,

    initialize: function(nextDataSource, options) {
        if (nextDataSource) {
            this.next = nextDataSource;
        }

        this.install(Object.getPrototypeOf(this));
    },

    /**
     * @implements dataModelAPI#needs
     * @see {@link https://fin-hypergrid.github.io/core/doc/dataModelAPI.html#needs|needs}
     */
    needs: function(key) {
        var transformer = this, source;
        do {
            if (transformer[key] && transformer[key] !== DataSourceBase.prototype[key]) {
                return;
            }
            source = transformer;
            transformer = transformer.next;
        } while (transformer);

        return source;
    },

    /**
     * @implements dataModelAPI#install
     * @see {@link https://fin-hypergrid.github.io/core/doc/dataModelAPI.html#install|install}
     */
    install: function(api, install) {
        var dataModel = this,
            keys = getFilteredKeys(api = api || this);

        keys.forEach(function(key) {
            if (install) {
                var source = dataModel.needs.call(dataModel, key);
                if (source) {
                    source[key] = api[key];
                }
            }

            if (!DataSourceBase.prototype[key]) {
                DataSourceBase.prototype[key] = function() {
                    if (this.next) {
                        return this.next[key].apply(this.next, arguments);
                    }
                };
            }
        });

    },


    // SYNONYMS

    isTree: function(x) {
        return this.isDrillDown(x);
    },

    getDataIndex: function(y) {
        return this.getRowIndex(y);
    },


    // DEBUGGING AIDS

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

// api can be array or object
function getFilteredKeys(api) {
    var whitelist = api.hasOwnProperty('!!keys') && api['!!keys'],
        blacklist = api.hasOwnProperty('!keys') && api['!keys'],
        keys = Array.isArray(api) ? api : Object.keys(api).filter(function(key) {
            return typeof api[key] === 'function';
        });

    return keys.filter(function(key) {
        switch (key) {
            case 'initialize':
            case 'constructor':
            case '!!keys':
            case '!keys':
                return;
        }

        return !(
            whitelist && whitelist.indexOf(key) < 0 ||
            blacklist && blacklist.indexOf(key) >= 0
        );
    });
}


// DataSourceError

function DataSourceError(message) {
    this.message = message;
}

// extend from `Error`
DataSourceError.prototype = Object.create(Error.prototype);

// override error name displayed in console
DataSourceError.prototype.name = 'DataSourceError';


module.exports = DataSourceBase;
