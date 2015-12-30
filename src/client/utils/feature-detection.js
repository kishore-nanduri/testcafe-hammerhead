import nativeMethods from '../sandbox/native-methods';
import { functionProto } from '../../protos';

// NOTE: In some browsers, elements without the url attribute return the location url
// when accessing this attribute directly. See form.action in Edge 25 as an example.
export var emptyActionAttrFallbacksToTheLocation = functionProto.call(nativeMethods.createElement, document, 'form').action ===
                                                   window.location.toString();
