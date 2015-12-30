import INTERNAL_PROPS from '../../processing/dom/internal-properties';
import EventEmitter from '../utils/event-emitter';
import BaseDomAdapter from '../../processing/dom/base-dom-adapter';
import nativeMethods from '../sandbox/native-methods';
import settings from '../settings';
import { sameOriginCheck } from '../utils/destination-location';
import { getProxyUrl } from '../utils/url';
import { isIE9 } from '../utils/browser';
import { findDocument } from '../utils/dom';
import { arrayProto, stringProto, functionProto } from '../../protos';

export default class ClientDomAdapter extends BaseDomAdapter {
    removeAttr (el, attr) {
        return el.removeAttribute(attr);
    }

    getAttr (el, attr) {
        return functionProto.call(nativeMethods.getAttribute, el, attr);
    }

    hasAttr (el, attr) {
        for (var i = 0; i < el.attributes.length; i++) {
            if (el.attributes[i].name === attr)
                return true;
        }

        return false;
    }

    getClassName (el) {
        return el.className;
    }

    hasEventHandler (el) {
        var attrs = el.attributes;

        for (var i = 0; i < attrs.length; i++) {
            if (arrayProto.indexOf(this.EVENTS, attrs[i]))
                return true;
        }

        return false;
    }

    getTagName (el) {
        return el.tagName;
    }

    setAttr (el, attr, value) {
        return functionProto.call(nativeMethods.setAttribute, el, attr, value);
    }

    setScriptContent (script, content) {
        script.text = content;
    }

    getScriptContent (script) {
        return script.text;
    }

    getStyleContent (style) {
        return style.innerHTML;
    }

    setStyleContent (style, content) {
        style.innerHTML = content;
    }

    getElementForSelectorCheck (el) {
        if (isIE9 && stringProto.toLowerCase(el.tagName) === 'script') {
            var clone = functionProto.call(nativeMethods.cloneNode, el, false);

            clone.src = clone.innerHTML = '';

            return clone;
        }

        return el;
    }

    needToProcessUrl () {
        return true;
    }

    hasIframeParent (el) {
        try {
            return window.top.document !== findDocument(el);
        }
        catch (e) {
            return true;
        }
    }

    attachEventEmitter (domProcessor) {
        var eventEmitter = new EventEmitter();

        domProcessor.on   = functionProto.bind(eventEmitter.on, eventEmitter);
        domProcessor.off  = functionProto.bind(eventEmitter.off, eventEmitter);
        domProcessor.emit = functionProto.bind(eventEmitter.emit, eventEmitter);
    }

    getCrossDomainPort () {
        return settings.get().crossDomainProxyPort;
    }

    getProxyUrl () {
        return functionProto.apply(getProxyUrl, null, arguments);
    }

    isTopParentIframe (el) {
        var elWindow = el[INTERNAL_PROPS.processedContext];

        return elWindow && window.top === elWindow.parent;
    }

    sameOriginCheck (location, checkedUrl) {
        return sameOriginCheck(location, checkedUrl);
    }
}
