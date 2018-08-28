'use strict';

let { ServerResponse } = require( 'http' );
let LogicalError       = require( 'logical-error' );
let serialize          = require( 'super-cookie/lib/serialize' );
let resolve            = require( 'safe-resolve-path' );
let rethrow            = require( './internal/rethrow' );
let report             = require( './internal/report' );
let mime               = require( 'mime' );

/**
 * @constructor module:router.Response
 */
let Response = {

  /**
   * @method module:router.Response.update
   * @param   {http.ServerResponse}  response
   * @param   {object}               data
   * @param   {http.IncomingMessage} data.request
   * @param   {module:router.Router} [data.router]
   * @return  {http.ServerResponse}
   * @example
   * let { Server } = require( 'http' );
   * let Response   = require( 'router/lib/Response' );
   *
   * let server = new Server( ( request, response ) => {
   *   if ( Response.update( response, { request } ) === response ) {
   *     console.log( 'returns response' );
   *   }
   *
   *   response.status( 200 ).end();
   * } );
   */
  update ( response, data ) {

    if ( Reflect.setPrototypeOf( response, Response.prototype ) ) {
      response._request = data.request;
      response._router  = data.router;
    } else {
      console.trace( 'cannot update response' );
    }

    return response;

  }

};

Response.prototype = Object.assign( Object.create( ServerResponse.prototype ), {

  /**
   * @method module:router.Response#header
   * @param {string|object} field
   * @param {string}        [value]
   * @chainable
   * @example
   * response.header( {
   *   'X-Frame-Options': 'DENY',
   *   'Content-Type':    'text/html' // will add '; charset=UTF-8'
   * } );
   *
   * response.header( 'Content-Security-Policy', "default-src 'self'" );
   */
  header ( field, value ) {

    if ( typeof field !== 'object' || field === null ) {
      if ( field === 'Content-Type' && ( value === 'text/html' || value === 'text/plain' ) ) {
        value += '; charset=UTF-8';
      }

      this.setHeader( field, value );
    } else {
      for ( let keys = Object.keys( field ), i = 0, l = keys.length; i < l; ++i ) {
        this.header( keys[ i ], field[ keys[ i ] ] );
      }
    }

    return this;

  },

  /**
   * @method module:router.Response#type
   * @param {string} type
   * @chainable
   * @example
   * response.type( './dist/index.js' );  // Content-Type: 'application/javascript'
   * response.type( 'application/json' ); // Content-Type: 'application/json'
   * response.type( 'html' );             // Content-Type: 'text/html'
   * response.type( 'xyz' );              // no Content-Type
   */
  type ( type ) {

    if ( type.indexOf( '/' ) < 0 || ! mime.getExtension( type ) ) {
      type = mime.getType( type );
    }

    if ( type ) {
      this.header( 'Content-Type', type );
    }

    return this;

  },

  /**
   * @method module:router.Response#status
   * @param {number} statusCode
   * @chainable
   * @example
   * response.status( 200 ); // 200: OK
   * response.status( 404 ); // 404: Not Found
   * response.status( 302 ); // 302: Found
   * response.status( 415 ); // 415: Unsupported Media Type
   */
  status ( statusCode ) {

    this.statusCode = statusCode;

    return this;

  },

  /**
   * @method module:router.Response#redirect
   * @param {number} [statusCode=302]
   * @param {string} url
   * @chainable
   * @example
   * response.redirect( 'back' );            // redirect to previous page
   * response.redirect( '/' );               // redirect to '/' (home)
   * response.redirect( 301, '/something' ); // redirect to '/something' with 301: Moved Permanently
   */
  redirect ( statusCode, url ) {

    if ( typeof url === 'undefined' ) {
      url = statusCode;
      statusCode = 302;
    }

    if ( url === 'back' ) {
      url = this.request().headers.referer || '/';
    }

    this.statusCode = statusCode;
    this.setHeader( 'Location', url );
    this.end();

    return this;

  },

  /**
   * @method module:router.Response#append
   * @param {string} field
   * @param {string} value
   * @chainable
   * @todo should be able to append from an object of headers
   * @example
   * response.append( 'Set-Cookie', 'x=1; HttpOnly' );
   * response.append( 'Set-Cookie', 'y=2; HttpOnly' );
   */
  append ( field, value ) {

    let current = this.getHeader( field );

    if ( typeof current === 'undefined' ) {
      current = [];
    } else if ( typeof current === 'string' ) {
      current = [ current ];
    }

    this.setHeader( field, current.concat( value ) );

    return this;

  },

  /**
   * Set response cookie using super-cookie module.
   * @method module:router.Response#cookie
   * @param {string} key
   * @param {string} value
   * @param {object} [options]
   * @chainable
   * @example
   * response.cookie( 'x', '1' );
   * response.cookie( 'y', '2' );
   * response.cookie( 'z', '3', { MaxAge: '1 hour', Secure: false } );
   */
  cookie ( key, value, options ) {

    return this.append( 'Set-Cookie', serialize( key, value, options || {} ) );

  },

  /**
   * @method module:router.Response#render
   * @param {string}   view
   * @param {object}   [data]
   * @param {function} [callback]
   * @chainable
   * @example
   * response.render( 'home', { session } );
   * response.render( 'user', { session, user } );
   */
  render ( view, data, callback ) {

    let { views } = this.router().settings;
    let engine    = this.engine();

    if ( typeof callback !== 'function' ) {
      if ( typeof data === 'function' ) {
        callback = data;
        data     = null;
      } else {
        callback = rethrow;
        report( 'response.render(view: string, [data: object], [callback: function]): self', 'no `callback` provided' );
      }
    }

    try {
      let html;
      let path = resolve( views, view );

      if ( engine.render ) {
        html = engine.render( path, data || {}, callback );
      } else {
        html = engine( path, data || {}, callback );
      }

      this.setHeader( 'Content-Type', 'text/html; charset=UTF-8' );
      this.end( html );
    } catch ( error ) {
      callback( error );
    }

    return this;

  },

  /**
   * @method module:router.Response#router
   * @return {module:router.Router}
   * @example <caption>Using with Router</caption>
   * let Router = require( 'router/lib/Router' );
   *
   * let router = new Router().use( ( request, response ) => {
   *   if ( response.router() === router ) {
   *     console.log( 'returns router' );
   *   }
   * } );
   *
   * @example <caption>Using without Router</caption>
   * let Response   = require( 'router/lib/Response' );
   * let { Server } = require( 'http' );
   *
   * let server = new Server( ( request, response ) => {
   *   Response.update( response, { request } );
   *
   *   try {
   *     let router = response.router();
   *   } catch ( error ) {
   *     console.log( error ); // Error: no router found
   *   }
   *
   *   response.status( 200 ).end();
   * } );
   */
  router: getter( 'router', 'Router' ),

  /**
   * Returns a router's template engine.
   * @method module:router.Response#engine
   * @return {function|object} Template engine as a function or instance with `render` method.
   * @example
   * router.set( 'view engine', 'ejs' );
   *
   * router.use( ( request, response ) => {
   *   console.log( typeof response.engine() ); // 'function'
   * } );
   */
  engine () {

    let settings = this.router().settings;
    let engine   = settings[ 'view engine' ];

    if ( typeof engine === 'string' ) {
      engine = require( engine );

      if ( engine.prototype && engine.prototype.render ) {
        engine = new engine()
          .set( 'layout', settings[ 'view layout' ] )
          .set( 'caching', settings[ 'view caching' ] );
      } else if ( engine.__express ) {
        engine = engine.__express;
      } else {
        throw LogicalError( 'response.engine(): any', 'engine you choice is not compatible with router' );
      }

      settings[ 'view engine' ] = engine;
    }

    return engine;

  },

  /**
   * @method module:router.Response#request
   * @return {http.IncomingMessage}
   * @example
   * router.use( ( request, response ) => {
   *   console.log( response.request() === request ); // true
   * } );
   */
  request: getter( 'request', 'http.IncomingMessage' )

} );

/**
 * Creates a getter function.
 * @private
 * @method getter
 * @param  {string} name
 * @param  {string} type
 * @return {function}
 */
function getter ( name, type ) {
  return function getter () {
    let value = this[ '_' + name ];

    if ( value ) {
      return value;
    }

    throw LogicalError( 'response.' + name + '(): ' + type, 'no ' + name + ' found' );
  };
}

module.exports = Response;
