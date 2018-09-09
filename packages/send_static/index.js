/* jshint esversion: 5 */

'use strict';

var NetworkError = require( 'utils/lib/NetworkError' );
var Route        = require( 'router/lib/Route' );
var resolve      = require( 'resolve_path' );
var fs           = require( 'fs' );

/**
 * @method sendStatic
 * @param  {string}        folder
 * @param  {object}        [options]
 * @param  {string|regexp} [options.pattern]
 * @return {module:router.Route}
 */
function sendStatic ( folder, options ) {
  // cast options.pattern to valid route path
  var pattern = options && options.pattern || /\.[a-z]+$/i;

  return new Route( pattern ).all( function ( request, response, next ) {
    var send;

    if ( request.method === 'HEAD' ) {
      send = sendHEAD;
    } else if ( request.method === 'GET' ) {
      send = sendGET;
    } else {
      return next();
    }

    send( response, resolve( folder, request.url ), next );
  } );
}

module.exports = sendStatic;

function handleError ( error, next ) {
  if ( error ) {
    if ( error.code === 'ENOENT' ) {
      next( new NetworkError( 404, null, error ) );
    } else {
      next( new NetworkError( 500, null, error ) );
    }

    return true;
  }
}

function sendHEAD ( response, path, next ) {
  fs.lstat( path, function ( error, stats ) {
    if ( ! handleError( error, next ) ) {
      response.status( 200 ).type( path ).header( 'Content-Length', stats.size ).end();
    }
  } );
}

function sendGET ( response, path, next ) {
  fs.access( path, fs.F_OK, function ( error ) {
    if ( ! handleError( error, next ) ) {
      new fs.ReadStream( path ).pipe( response.status( 200 ).type( path ) );
    }
  } );
}
