/* jshint esversion: 3 */

'use strict';

var messages = {};

/**
 * console.warn message only once.
 * @private
 * @method report
 * @param  {string} method  Method that reports a message.
 * @param  {string} message A message to report.
 * @return {void}
 * @example
 * report( 'greet(name: string): void', 'no name provided!' );       // warn: `greet(name: string): void` no name provided!
 * report( 'greet(name: string): void', 'something bad happened.' ); // warn: `greet(name: string): void` something bad happened.
 * report( 'greet(name: string): void', 'no name provided!' );       // nothing
 * report( 'greet(name: string): void', 'something bad happened.' ); // nothing
 */
function report ( method, message ) {

  if ( ! messages[ method ] ) {
    messages[ method ] = {};
  } else if ( messages[ method ][ message ] ) {
    return;
  }

  console.warn( '`' + method + '` ' + message );

  messages[ method ][ message ] = true;

}

module.exports = report;
