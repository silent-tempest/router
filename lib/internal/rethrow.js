/* jshint esversion: 3 */

'use strict';

/**
 * Re-throws an error if receives it.
 * @private
 * @method rethrow
 * @param  {Error} [error]
 * @return {void}
 */
function rethrow ( error ) {
  if ( error ) {
    throw error;
  }
}

module.exports = rethrow;
