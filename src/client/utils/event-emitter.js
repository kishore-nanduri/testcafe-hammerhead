import { functionProto, arrayProto, stringProto } from '../../protos';

export default class EventEmitter {
    constructor () {
        this.eventsListeners = [];
    }

    emit (evt) {
        var listeners = this.eventsListeners[evt];

        if (listeners) {
            for (var i = 0; i < listeners.length; i++) {
                try {
                    if (listeners[i])
                        functionProto.apply(listeners[i], this, arrayProto.slice(arguments, 1));
                }
                catch (e) {
                    // HACK: For IE: after calling document.write, the IFrameSandbox event handler throws the
                    // 'Can't execute code from a freed script' exception because the document has been
                    // recreated.
                    if (e.message && stringProto.indexOf(e.message, 'freed script') > -1)
                        listeners[i] = null;
                    else
                        throw e;
                }
            }
        }
    }

    off (evt, listener) {
        var listeners = this.eventsListeners[evt];

        if (listeners)
            this.eventsListeners[evt] = arrayProto.filter(listeners, item => item !== listener);
    }

    on (evt, listener) {
        if (!this.eventsListeners[evt])
            this.eventsListeners[evt] = [];

        arrayProto.push(this.eventsListeners[evt], listener);
    }
}
