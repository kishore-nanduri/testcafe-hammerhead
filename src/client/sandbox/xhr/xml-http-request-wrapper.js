import { objectStatic, functionProto, stringProto, arrayProto } from '../../../protos';

// NOTE: We should wrap the xhr response (B236741).
export default class XMLHttpRequestWrapper {
    static _wrapProp (xhr, xhrWrapper, propName) {
        objectStatic.defineProperty(xhrWrapper, propName, {
            get: () => {
                if (stringProto.indexOf(propName, 'on') === 0)
                    return typeof xhr[propName] === 'function' ? xhr[propName]('get') : xhr[propName];

                return xhr[propName];
            },
            set: value => {
                if (stringProto.indexOf(propName, 'on') === 0) {
                    xhr[propName] = typeof value !== 'function' ? value : (func => function () {
                        return arguments[0] === 'get' ? func : functionProto.apply(func, xhrWrapper, arguments);
                    })(value);
                }
                else
                    xhr[propName] = value;

                return xhr[propName];
            }
        });
    }

    static _wrapFunc (xhr, xhrWrapper, funcName) {
        var eventHandlers = [];

        xhrWrapper[funcName] = function () {
            var args   = arrayProto.slice(arguments);
            var isFunc = typeof args[1] === 'function';

            if (funcName === 'addEventListener' && isFunc) {
                var originHandler  = args[1];
                var wrappedHandler = function () {
                    functionProto.apply(originHandler, xhrWrapper, arguments);
                };

                args[1] = wrappedHandler;

                arrayProto.push(eventHandlers, {
                    origin:  originHandler,
                    wrapped: wrappedHandler
                });
            }
            else if (funcName === 'removeEventListener' && isFunc) {
                for (var i = 0; i < eventHandlers.length; i++) {
                    if (eventHandlers[i].origin === args[1]) {
                        args[1] = eventHandlers[i].wrapped;
                        arrayProto.splice(eventHandlers, i, 1);

                        break;
                    }
                }
            }

            return functionProto.apply(xhr[funcName], xhr, args);
        };
    }

    constructor (xhr) {
        const XHR_PROPERTY_ACCESS_ERROR = 'hammerhead|xhr-property-access-error';

        for (var prop in xhr) {
            if (!objectStatic.hasOwnProperty(xhr, prop)) {
                var isFunction = false;

                // NOTE: In some cases, reading the xhr properties leads to errors (B253550, T177746).
                // If it happens, we wrap these properties without reading them.
                try {
                    isFunction = typeof xhr[prop] === 'function';
                }
                catch (e) {
                    if (stringProto.indexOf(e.message, XHR_PROPERTY_ACCESS_ERROR) < 0)
                        throw e;
                }

                if (isFunction)
                    XMLHttpRequestWrapper._wrapFunc(xhr, this, prop);
                else
                    XMLHttpRequestWrapper._wrapProp(xhr, this, prop);
            }
        }
    }
}
