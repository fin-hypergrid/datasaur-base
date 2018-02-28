# datasaur-base

Abstract base class for Hypergrid data model modules.

The cascading data model consists of a data owner module at the bottom with zero or more data transformer modules attached.

The data owner module should extend from `datasaur-owner` (which extends from this class, `datasaur-base`), while the transformer modules should extend directly from this class.

datasaur-base@3.0.0 together with datasaur-owner@3.0.0 implements the [data model interface](https://fin-hypergrid.github.io/3.0.0/doc/dataModelAPI) with fallbacks, superseding `fin-hypergrid-data-source-base` (which will no longer be maintained).

Data Controllers are no longer supported by Hypergrid as of version 3.0.0 and are no longer supported by the data model. In their place, data models now accept interface setup from the application, which should include a `dispatchEvent` method which data models call to trigger events on the application.
