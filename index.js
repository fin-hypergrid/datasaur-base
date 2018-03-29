'use strict';

function DatasaurBase() {}

DatasaurBase.extend = require('extend-me'); // make `extend`-able

/**
 * @classdesc Concatenated data model base class.
 * @param {Datasaur} [datasaur] - Omit for origin (actual data source). Otherwise, point to source you are transforming.
 * @param {object} [options] - Not used here at this time. Define properties as needed for custom datasaurs.
 */
DatasaurBase.prototype = {
    constructor: DatasaurBase.prototype.constructor,

    $$CLASS_NAME: 'DatasaurBase',

    isNullObject: true,

    drillDownCharMap: {
        true: '\u25bc', // BLACK DOWN-POINTING TRIANGLE aka '▼'
        false: '\u25b6', // BLACK RIGHT-POINTING TRIANGLE aka '▶'
        undefined: '', // leaf rows have no control glyph
        null: '   ' // indent
    },

    DataModelError: DataModelError,

    initialize: function(datasaur, options) {
        if (datasaur) {
            this.datasaur = datasaur;
            this.handlers = datasaur.handlers;
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

            if (!DatasaurBase.prototype[key]) {
                DatasaurBase.prototype[key] = function() {
                    if (this.datasaur) {
                        return this.datasaur[key].apply(this.datasaur, arguments);
                    }
                };
            }
        });
    },

    dispatchEvent: function(nameOrEvent) {
        this.handlers.forEach(function(handler) {
            handler.call(this, nameOrEvent);
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
 * The search excludes members of `DatasaurBase.prototype`.
 * @param {object} transformer - Data model transformer list, linked backwards one to the previous one by `datasaur` property.
 * The first transformer, the actual data source, has null `datasaur`, meaning start-of-list.
 * @param {string} key - Property to search for.
 * @param {boolean} force - Always needed, so always return last object in list. All other implementations will be deleted (all implementations found along prototype chains of all transformers).
 * @returns {undefined|object} - `undefined` means an implementation was found; otherwise returns utlimate datasaur (last datasaur in linked list).
 */
function needs(transformer, key, force) {
    var source;

    do {
        if (transformer[key]) {
            if (force) {
                for (var link = transformer; link && link !== Object.prototype; link = Object.getPrototypeOf(link)) {
                    delete link[key];
                }
            } else if (transformer[key] !== DatasaurBase.prototype[key]) {
                return; // means implementation exists (ignoring previously installed forwarding catchers in base)
            }
        }
        source = transformer;
        transformer = transformer.datasaur;
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


// DataModelError

function DataModelError(message) {
    this.message = message;
}

// extend from `Error'
DataModelError.prototype = Object.create(Error.prototype);

// override error name displayed in console
DataModelError.prototype.name = 'DataModelError';


module.exports = DatasaurBase;
