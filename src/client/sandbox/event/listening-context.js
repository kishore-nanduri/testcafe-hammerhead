// NOTE: For internal usage of Listeners.
import { isIE, version as browserVersion } from '../../utils/browser';
import { stringProto, regExpProto, arrayProto } from '../../../protos';

const ELEMENT_LISTENING_EVENTS_STORAGE_PROP = 'hammerhead|element-listening-events-storage-prop';

export function getElementCtx (el) {
    return el[ELEMENT_LISTENING_EVENTS_STORAGE_PROP];
}

export function getEventCtx (el, event) {
    event = isIE && browserVersion > 10 &&
            regExpProto.test(/MSPointer/, event) ? stringProto.toLowerCase(stringProto.replace(event, 'MS', '')) : event;

    return getElementCtx(el)[event] || null;
}

export function isElementListening (el) {
    return !!el[ELEMENT_LISTENING_EVENTS_STORAGE_PROP];
}

export function addListeningElement (el, events) {
    var elementCtx = getElementCtx(el) || {};

    for (var i = 0; i < events.length; i++) {
        if (!elementCtx[events[i]]) {
            elementCtx[events[i]] = {
                internalHandlers:     [],
                outerHandlers:        [],
                outerHandlersWrapper: null,
                wrappers:             [],
                cancelOuterHandlers:  false
            };
        }
    }

    if (!isElementListening(el))
        el[ELEMENT_LISTENING_EVENTS_STORAGE_PROP] = elementCtx;
}

export function removeListeningElement (el) {
    delete el[ELEMENT_LISTENING_EVENTS_STORAGE_PROP];
}

export function addFirstInternalHandler (el, events, handler) {
    var elementCtx = getElementCtx(el);

    for (var i = 0; i < events.length; i++)
        arrayProto.unshift(elementCtx[events[i]].internalHandlers, handler);
}

export function addInternalHandler (el, events, handler) {
    var elementCtx = getElementCtx(el);

    for (var i = 0; i < events.length; i++)
        arrayProto.push(elementCtx[events[i]].internalHandlers, handler);
}

export function removeInternalHandler (el, events, handler) {
    var elementCtx = getElementCtx(el);

    for (var i = 0; i < events.length; i++) {
        var internalHandlers = elementCtx[events[i]].internalHandlers;
        var handlerIndex     = arrayProto.indexOf(internalHandlers, handler);

        if (handlerIndex > -1)
            arrayProto.splice(internalHandlers, handlerIndex, 1);
    }
}

export function wrapEventListener (eventCtx, listener, wrapper, useCapture) {
    arrayProto.push(eventCtx.outerHandlers, {
        fn:         listener,
        useCapture: useCapture || false
    });
    arrayProto.push(eventCtx.wrappers, wrapper);
}

export function getWrapper (eventCtx, listener, useCapture) {
    var originListeners = eventCtx.outerHandlers;
    var wrappers        = eventCtx.wrappers;
    var wrapper         = null;

    for (var i = 0; i < originListeners.length; i++) {
        var curListener = originListeners[i];

        if (curListener.fn === listener && (curListener.useCapture || false) === (useCapture || false)) {
            wrapper = wrappers[i];

            arrayProto.splice(wrappers, i, 1);
            arrayProto.splice(originListeners, i, 1);

            return wrapper;
        }
    }
}
