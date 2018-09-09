'use strict';

let methods  = require( 'methods' );
let Response = require( './Response' );
let Route    = require( './Route' );

/**
 * @constructor module:router.Router
 * @example
 * let Router = require( 'router/lib/Router' );
 * let router = new Router();
 */
function Router () {
  this.settings = {
    'view cache': false,
    'view layout': null,
    'view engine': null,
    'views': 'views'
  };

  this.routes = [];
}

Router.prototype = {
  /**
   * @method module:router.Router#use
   * @param {string}                            [path="*"]
   * @param {...(function|module:router.Route)} handlers
   * @chainable
   * @example
   * router
   *   .use( logger )
   *   .use( '/', bodyParser.json() )
   *   .use( '/', bodyParser.urlencoded( { extended: false } ) )
   *   .use( helmet() );
   *
   * function logger ( request, response, next ) {
   *   console.log( request.method, request.url );
   *   next();
   * }
   */
  use ( path ) {
    let offset;

    if ( typeof path === 'string' || path instanceof RegExp ) {
      offset = 1;
    } else {
      path = '*';
      offset = 0;
    }

    for ( ; offset < arguments.length; ++offset ) {
      let handler = arguments[ offset ];

      if ( handler instanceof Route === false ) {
        handler = new Route( path ).all( handler );
      }

      this.routes.push( handler );
    }

    return this;
  },

  /**
   * @method module:router.Router#handle
   * @param  {http.IncomingMessage} request
   * @param  {http.ServerResponse}  response
   * @return {void}
   * @example
   * http.createServer( router.handle.bind( router ) );
   */
  handle ( request, response ) {
    let self  = this;
    let index = 0;

    Response.update( response, { request, router: this } );

    function next ( error ) {
      for ( let length = self.routes.length; index < length; ) {
        let route = self.routes[ index++ ];

        if ( ! route._handles( request, error ) ) {
          continue;
        }

        return route
          ._process( request )
          ._handle( request, response, next, error );
      }

      if ( error ) {
        throw error;
      }
    }

    next();
  },

  /**
   * @method module:router.Router#set
   * @param {string} key
   * @param {any}    value
   * @chainable
   * @example
   * router.set( 'view cache', true );
   */
  set ( key, value ) {
    this.settings[ key ] = value;
    return this;
  },

  constructor: Router
};

methods.concat( 'all' ).forEach( ( lowerMethod ) => {
  Router.prototype[ lowerMethod ] = function ( path, handler ) {
    this.routes.push( new Route( path )[ lowerMethod ]( handler ) );
    return this;
  };
} );

module.exports = Router;
