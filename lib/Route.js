'use strict';

let ArgumentException = require( 'utils/lib/ArgumentException' );
let LogicalError      = require( 'utils/lib/LogicalError' );
let methods           = require( 'methods' );
let toString = Object.prototype.toString;

/**
 * @constructor module:router.Route
 * @param {string|regexp} path
 * @example
 * let Route = require( 'router/lib/Route' );
 *
 * let home = new Route( '/' )
 *   .get( ( request, response, next ) => {
 *     response.status( 200 ).render( 'home', next );
 *   } );
 *
 * router.use( home );
 */
function Route ( path ) {
  let _params = [];

  if ( typeof path === 'string' ) {
    this.path = path;

    if ( path !== '*' ) {
      path = path.replace( /:([_a-z$][\w$]*)/gi, ( match, name ) => {

        if ( ~ _params.indexOf( name ) ) {
          throw Error( '"' + name + '" parameter already exists' );
        }

        _params.push( name );

        return '([^/]+)';

      } );

      this._pattern$ = RegExp( '^' + path + '/?$' );
      this._pattern  = RegExp( '^' + path + '/?' );
    } else {
      this._pattern = /^[^]*$/;
    }
  } else if ( path instanceof RegExp ) {
    this._pattern = path;
  } else {
    throw TypeError( 'expected a string or regexp, but got ' + toString.call( path ) );
  }

  this._handlers = {};
  this._params   = _params;
}

Route.prototype = {
  /**
   * @private
   * @method module:router.Route#_handle
   * @param  {http.IncomingMessage} request
   * @param  {http.ServerResponse}  response
   * @param  {function}             next
   * @param  {any}                  [error]
   * @return {void}
   */
  _handle ( request, response, next, error ) {
    let handler = this._handler( request, error );

    if ( error ) {
      handler( error, request, response, next );
    } else {
      handler( request, response, next );
    }
  },

  /**
   * Returns route's handler for a request.
   * @private
   * @method module:router.Route#_handler
   * @param  {http.IncomingMessage} request
   * @param  {any}                  error
   * @return {function?}
   */
  _handler ( request, error ) {
    let handler = this._handlers.ALL || this._handlers[ request.method ];

    if ( ! handler ) {
      return;
    }

    if ( error ? handler.length < 4 : handler.length >= 4 ) {
      return;
    }

    return handler;
  },

  /**
   * @private
   * @method module:router.Route#_handles
   * @param  {http.IncomingMessage} request
   * @param  {any}                  error
   * @return {any}
   */
  _handles ( request, error ) {
    return this._handler( request, error ) && ( this._pattern$ || this._pattern ).test( request.url );
  },

  /**
   * @private
   * @method module:router.Route#_process
   * @param {http.IncomingMessage} request
   * @chainable
   */
  _process ( request ) {
    request.params = {};

    if ( this._params.length ) {
      let match = this._pattern.exec( request.url );

      for ( let i = 0, l = this._params.length; i < l; ++i ) {
        request.params[ this._params[ i ] ] = match[ i + 1 ];
      }
    }

    return this;
  },

  constructor: Route
};

methods.concat( 'all' ).forEach( ( lowerMethod ) => {
  let upperMethod = lowerMethod.toUpperCase();

  Route.prototype[ lowerMethod ] = function ( handler ) {
    let method = '<Route>.' + lowerMethod + '(handler: function)';

    if ( typeof handler !== 'function' ) {
      throw ArgumentException( method, 'handler', handler );
    }

    if ( this._handlers[ upperMethod ] || arguments.length > 1 ) {
      throw LogicalError( method, 'multiple method handlers not implemented. use another route for this' );
    }

    if ( this._handlers.ALL ) {
      throw LogicalError( method, 'adding a handler to another method when ALL exists does not make sense' );
    }

    this._handlers[ upperMethod ] = handler;

    return this;
  };
} );

module.exports = Route;
