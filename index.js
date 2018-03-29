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
            this.handlers = nextDataSource.handlers;
        } else {
            this.handlers = [];
        }

        this.install(Object.getPrototypeOf(this));
    },

    /**
     * @implements dataModelAPI#install
     * @see {@link https://fin-hypergrid.github.io/core/doc/dataModelAPI.html#install|install}
     */
    install: function(api, options) {
        var dataModel = this,
            keys = getFilteredKeys(api);

        options = options || {};

        keys.forEach(function(key) {
            if (options.inject && !Array.isArray(api)) {
                var source = needs(dataModel, key, options.force);
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

    dispatchEvent: function(name, detail) {
        this.handlers.forEach(function(handler) {
            handler.call(this, name, detail);
        }, this);
    },

    addListener: function(handler) {
        if (this.handlers.indexOf(handler) < 0) {
            this.handlers.push(handler);
        }
    },

    removeListener: function(handler) {
        var index = this.handlers.indexOf(handler);
        if (index) {
            delete this.handlers[index];
        }
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

/**
 * Searches linked list of objects for implementation of `key` anywhere on their prototype chain.
 * The search excludes members of `DataSourceBase.prototype`.
 * @param {object} transformer - Data model transformer list, linked one to the next by `next` property. Falsy `next` means end-of-list.
 * @param {string} key - Property to search for.
 * @param {boolean} force - Always needed, so always delete other implementations (all implementations found along prototype chains of all transformers) and return last object in list.
 * @returns {undefined|object} - `undefined` means an implementation was found; otherwise returns last object in list.
 */
function needs(transformer, key, force) {
    var source;

    do {
        if (transformer[key]) {
            if (force) {
                for (var link = transformer; link && link !== Object.prototype; link = Object.getPrototypeOf(link)) {
                    delete link[key];
                }
            } else if (transformer[key] !== DataSourceBase.prototype[key]) {
                return; // means implementation exists (ignoring previously installed forwwarding catchers in base)
            }
        }
        source = transformer;
        transformer = transformer.next;
    } while (transformer);

    return source;
}

var blacklistAlways = ['constructor', 'initialize', '!keys', '!!keys'];

/**
 * The following keys (array elements or object keys) are filtered out:
 * * Defined as something other than a function, including an accessor (getter and/or setter)
 * * Keys missing from whitelist (not listed in string array `api['!!keys']`, when defined)
 * * Keys blacklisted (listed in string array `api['!keys']` or `blacklistAlways`)
 * @param {string[]|object} api
 * @returns {string[]}
 */
function getFilteredKeys(api) {
    var whitelist = api.hasOwnProperty('!!keys') && api['!!keys'],
        blacklist = blacklistAlways.concat(api.hasOwnProperty('!keys') && api['!keys'] || []),
        keys;

    if (Array.isArray(api)) {
        keys = api;
    } else {
        keys = Object.keys(api).filter(function(key) {
            return typeof Object.getOwnPropertyDescriptor(api, key).value === 'function';
        });
    }

    return keys.filter(function(key) {
        return !(
            whitelist && whitelist.indexOf(key) < 0 ||
            blacklist.indexOf(key) >= 0
        );
    });
}


// DataSourceError

function DataSourceError(message) {
    this.message = message;
}

// extend from `Error'
DataSourceError.prototype = Object.create(Error.prototype);

// override error name displayed in console
DataSourceError.prototype.name = 'DataSourceError';


module.exports = DataSourceBase;
