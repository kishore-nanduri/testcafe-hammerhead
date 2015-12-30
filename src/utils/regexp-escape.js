// -------------------------------------------------------------
// WARNING: this file is used by both the client and the server.
// Do not use any browser or node-specific API!
// -------------------------------------------------------------
/* eslint hammerhead/proto-methods: 2 */
import { stringProto } from '../protos';

// NOTE: taken from https://github.com/benjamingr/RegExp.escape
export default function (str) {
    return stringProto.replace(str, /[\\^$*+?.()|[\]{}]/g, '\\$&');
}
