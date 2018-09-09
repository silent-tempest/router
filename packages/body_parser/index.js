'use strict';

let NetworkError = require( 'utils/lib/NetworkError' );
let parse        = require( 'qs/lib/parse' );
let mime         = require( 'mime' );

let types = {
  'URLENCODED': 'application/x-www-form-urlencoded'
};

let defaults = {
  limit: 1024 // 1KB
};

/**
 * @method bodyParser
 * @param  {object} options
 * @param  {object} options.extensions
 * @return {function}
 * @example
 * var bodyParser = require( 'router.body-parser' );
 *
 * var parseBody = bodyParser( {
 *   extensions: {
 *     URLENCODED: 128, // 128B
 *     JPEG:       null // default limit: 1KB (1024B)
 *   }
 * } );
 *
 * router.use( parseBody );
 */
function bodyParser ( options = {} ) {
  if ( ! options.extensions ) {
    throw Error( 'specify `options.extensions`' );
  }

  let extensions = {};

  for ( let [ extension, limit ] of Object.entries( options.extensions ) ) {
    let type = mime.getType( extension ) || types[ extension ] || types[ extension.toUpperCase() ];

    if ( ! type ) {
      throw Error( `unsupported media type "${type}"` );
    }

    if ( limit === null ) {
      limit = defaults.limit;
    }

    extensions[ type ] = limit;
  }

  function parseBody ( request, response, next ) {
    request.rawBody = null;
    request.body    = '';

    if ( request.method !== 'POST' ) {
      return next();
    }

    let length = + request.headers[ 'content-length' ];
    let type   =   request.headers[ 'content-type' ];
    let statusCode;

    if ( ! type || ! extensions[ type ] && ! extensions[ type = type.split( ';' )[ 0 ] ] ) {
      statusCode = 415; // Unsupported Media Type
    } else if ( isNaN( length ) ) {
      statusCode = 411; // Length Required
    } else if ( length > extensions[ type ] ) {
      statusCode = 413; // Payload Too Large
    }

    if ( statusCode ) {
      return next( new NetworkError( statusCode ) );
    }

    let chunks     = [];
    let bodyLength = 0;

    function data ( chunk ) {
      if ( ( bodyLength += chunk.length ) > length ) {
        throw new NetworkError( 413 );
      }

      chunks.push( chunk );
    }

    function end ( error ) {
      // jshint validthis: true
      try {
        if ( error ) {
          if ( error instanceof NetworkError === false ) {
            error = NetworkError.from( error );
          }

          throw error;
        }

        if ( bodyLength !== length ) {
          throw new NetworkError( 400 );
        }

        this.rawBody = Buffer.concat( chunks );

        if ( type === 'application/json' ) {
          this.body = JSON.parse( this.rawBody );
        } else if ( type === 'application/x-www-form-urlencoded' ) {
          this.body = parse( '' + this.rawBody );
        }

        next();
      } catch ( error ) {
        if ( error instanceof NetworkError === false ) {
          error = new NetworkError( 422 ); // jshint ignore: line
        }

        next( error );
      }

      this
        .removeListener( 'data', data )
        .removeListener( 'end', end );

      // jshint validthis: false
    }

    request
      .on( 'data', data )
      .on( 'end', end );
  }

  return parseBody;
}

module.exports = bodyParser;
