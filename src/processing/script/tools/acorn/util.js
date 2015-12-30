// -------------------------------------------------------------
// WARNING: this file is used by both the client and the server.
// Do not use any browser or node-specific API!
// -------------------------------------------------------------

import { functionProto } from '../../../../protos';

export function isArray(obj) {
  return functionProto.call(Object.prototype.toString, obj) === "[object Array]"
}

// Checks if an object has a property.

export function has(obj, propName) {
  return functionProto.call(Object.prototype.hasOwnProperty, obj, propName)
}
