/*global history, navigator*/
import SandboxBase from '../base';
import ShadowUI from '../shadow-ui';
import CodeInstrumentation from '../code-instrumentation';
import nativeMethods from '../native-methods';
import { processScript } from '../../../processing/script';
import * as destLocation from '../../utils/destination-location';
import { isSubDomain, parseUrl, getProxyUrl } from '../../utils/url';
import { isFirefox } from '../../utils/browser';
import { isCrossDomainWindows, isImgElement, isBlob } from '../../utils/dom';
import INTERNAL_ATTRS from '../../../processing/dom/internal-attributes';
import { arrayProto, stringProto, functionProto } from '../../../protos';

export default class WindowSandbox extends SandboxBase {
    constructor (nodeSandbox, messageSandbox) {
        super();

        this.nodeSandbox    = nodeSandbox;
        this.messageSandbox = messageSandbox;

        this.UNCAUGHT_JS_ERROR_EVENT = 'hammerhead|event|uncaught-js-error';
    }

    _raiseUncaughtJsErrorEvent (msg, window, pageUrl) {
        if (!isCrossDomainWindows(window, window.top)) {
            var sendToTopWindow = window !== window.top;

            if (!pageUrl)
                pageUrl = destLocation.get();

            if (sendToTopWindow) {
                this.emit(this.UNCAUGHT_JS_ERROR_EVENT, {
                    msg:      msg,
                    pageUrl:  pageUrl,
                    inIframe: true
                });

                this.messageSandbox.sendServiceMsg({
                    cmd:     this.UNCAUGHT_JS_ERROR_EVENT,
                    pageUrl: pageUrl,
                    msg:     msg
                }, window.top);
            }
            else {
                this.emit(this.UNCAUGHT_JS_ERROR_EVENT, {
                    msg:     msg,
                    pageUrl: pageUrl
                });
            }
        }
    }

    attach (window) {
        super.attach(window);

        var messageSandbox = this.messageSandbox;
        var nodeSandbox    = this.nodeSandbox;

        messageSandbox.on(messageSandbox.SERVICE_MSG_RECEIVED_EVENT, e => {
            var message = e.message;

            if (message.cmd === this.UNCAUGHT_JS_ERROR_EVENT)
                this._raiseUncaughtJsErrorEvent(message.msg, window, message.pageUrl);
        });

        window.CanvasRenderingContext2D.prototype.drawImage = function () {
            var image = arguments[0];

            if (isImgElement(image)) {
                var changedArgs = arrayProto.slice(arguments);
                var src         = image.src;

                if (destLocation.sameOriginCheck(location.toString(), src)) {
                    changedArgs[0]     = functionProto.call(nativeMethods.createElement, window.document, 'img');
                    changedArgs[0].src = getProxyUrl(src);
                }
            }

            return functionProto.apply(nativeMethods.canvasContextDrawImage, this, changedArgs || arguments);
        };

        // NOTE: Override uncaught error handling.
        window.onerror = (msg, url, line, col, errObj) => {
            // NOTE: Firefox raises the NS_ERROR_NOT_INITIALIZED exception after the window is removed from the dom.
            if (stringProto.indexOf(msg, 'NS_ERROR_NOT_INITIALIZED') !== -1)
                return true;

            var originalOnErrorHandler = CodeInstrumentation.getOriginalErrorHandler(window);
            var caught                 = originalOnErrorHandler &&
                                         functionProto.call(originalOnErrorHandler, window, msg, url, line, col, errObj) === true;

            if (caught)
                return true;

            this._raiseUncaughtJsErrorEvent(msg, window);

            return false;
        };

        window.open = function () {
            var newArgs = [];

            arrayProto.push(newArgs, getProxyUrl(arguments[0]));
            arrayProto.push(newArgs, '_self');

            if (arguments.length > 2)
                arrayProto.push(newArgs, arguments[2]);
            if (arguments.length > 3)
                arrayProto.push(newArgs, arguments[3]);

            return functionProto.apply(nativeMethods.windowOpen, window, newArgs);
        };

        window.Worker = scriptURL => {
            scriptURL = getProxyUrl(scriptURL);

            return new nativeMethods.Worker(scriptURL);
        };

        if (window.Blob) {
            window.Blob = function (parts, opts) {
                if (arguments.length === 0)
                    return new nativeMethods.Blob();

                var type = opts && opts.type && stringProto.toLowerCase(opts.type.toString());

                // NOTE: If we cannot identify the content type of data, we're trying to process it as a script.
                // Unfortunately, we do not have the ability to exactly identify a script. That's why we make such
                // an assumption. We cannot solve this problem at the Worker level either, because the operation of
                // creating a new Blob instance is asynchronous. (GH-231)
                if (!type || type === 'text/javascript' || type === 'application/javascript' ||
                    type === 'application/x-javascript')
                    parts = [processScript(arrayProto.join(parts, ''), true, false)];

                // NOTE: IE11 throws an error when the second parameter of the Blob function is undefined (GH-44)
                // If the overridden function is called with one parameter, we need to call the original function
                // with one parameter as well.
                return arguments.length === 1 ? new nativeMethods.Blob(parts) : new nativeMethods.Blob(parts, opts);
            };
        }

        window.EventSource = url => new nativeMethods.EventSource(getProxyUrl(url));

        if (window.MutationObserver) {
            window.MutationObserver = callback => {
                var wrapper = mutations => {
                    var result = [];

                    for (var i = 0; i < mutations.length; i++) {
                        if (!ShadowUI.isShadowUIMutation(mutations[i]))
                            arrayProto.push(result, mutations[i]);
                    }

                    if (result.length)
                        callback(result);
                };

                return new nativeMethods.MutationObserver(wrapper);
            };
        }

        if (nativeMethods.registerServiceWorker) {
            window.navigator.serviceWorker.register = url => {
                url = getProxyUrl(url);

                return functionProto.call(nativeMethods.registerServiceWorker, window.navigator.serviceWorker, url);
            };
        }

        window.Image = function () {
            var image = null;

            if (!arguments.length)
                image = new nativeMethods.Image();
            else if (arguments.length === 1)
                image = new nativeMethods.Image(arguments[0]);
            else
                image = new nativeMethods.Image(arguments[0], arguments[1]);

            nodeSandbox.overrideDomMethods(image);

            return image;
        };

        if (typeof window.history.pushState === 'function' && typeof window.history.replaceState === 'function') {
            window.history.pushState = function (data, title, url) {
                var args = [data, title];

                if (arguments.length > 2)
                    arrayProto.push(args, url ? getProxyUrl(url) : url);

                return functionProto.apply(nativeMethods.historyPushState, history, args);
            };

            window.history.replaceState = function (data, title, url) {
                var args = [data, title];

                if (arguments.length > 2)
                    arrayProto.push(args, url ? getProxyUrl(url) : url);

                return functionProto.apply(nativeMethods.historyReplaceState, history, args);
            };
        }

        if (window.navigator.registerProtocolHandler) {
            window.navigator.registerProtocolHandler = function () {
                var args         = arrayProto.slice(arguments);
                var urlIndex     = 1;
                var destHostname = destLocation.getParsed().hostname;
                var isDestUrl    = isFirefox ? isSubDomain(destHostname, parseUrl(args[urlIndex]).hostname) :
                                   destLocation.sameOriginCheck(destLocation.get(), args[urlIndex]);

                if (isDestUrl)
                    args[urlIndex] = getProxyUrl(args[urlIndex]);

                return functionProto.apply(nativeMethods.registerProtocolHandler, navigator, args);
            };
        }

        if (window.FormData) {
            window.FormData.prototype.append = function (name, value) {
                // NOTE: We should not send our hidden input's value along with the file info,
                // because our input may have incorrect value if the input with the file has been removed from DOM.
                if (name === INTERNAL_ATTRS.uploadInfoHiddenInputName)
                    return;

                // NOTE: If we append our file wrapper to FormData, we will lose the file name.
                // This happens because the file wrapper is an instance of Blob
                // and a browser thinks that Blob does not contain the "name" property.
                if (arguments.length === 2 && isBlob(value) && 'name' in value)
                    functionProto.call(nativeMethods.formDataAppend, this, name, value, value.name);
                else
                    functionProto.apply(nativeMethods.formDataAppend, this, arguments);
            };
        }
    }
}
