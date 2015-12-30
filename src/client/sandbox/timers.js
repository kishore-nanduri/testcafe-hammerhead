import SandboxBase from './base';
import nativeMethods from './native-methods';
import { processScript } from '../../processing/script';
import { isIE, version as browserVersion } from '../utils/browser';
import { arrayProto, functionProto } from '../../protos';

// NOTE: When you call the focus and blur function for some elements in IE, the event handlers  must be raised
// asynchronously, but before executing functions that are called by using the window.setTimeout function. So,
// we need to raise the handlers with a timeout, but do it before calling other asynchronous functions.
export default class TimersSandbox extends SandboxBase {
    constructor () {
        super();

        this.timeouts          = [];
        this.deferredFunctions = [];
        this.setTimeout        = nativeMethods.setTimeout;
    }

    _wrapTimeoutFunctionsArguments (args) {
        var isScriptFirstArg = typeof args[0] === 'string';
        var func             = !isScriptFirstArg ? args[0] : null;
        var script           = isScriptFirstArg ? processScript(args[0], false, false) : null;

        if (isIE && browserVersion < 12) {
            var timersSandbox = this;
            var fnToRun       = isScriptFirstArg ? () => {
                // NOTE: We are switching eval to the global context with this assignment.
                // Unlike eval, the setTimeout/setInterval functions always work in the global context.
                var ev = this.window.eval;

                return ev(script);
            } : func;

            args[0] = function () {
                return timersSandbox._callDeferredFunction(fnToRun, arguments);
            };
        }
        else if (isScriptFirstArg)
            args[0] = script;

        return args;
    }

    _callDeferredFunction (fn, args) {
        if (this.timeouts.length) {
            var curTimeouts = [];
            var curHandlers = [];

            for (var i = 0; i < this.timeouts.length; i++) {
                arrayProto.push(curTimeouts, this.timeouts[i]);
                arrayProto.push(curHandlers, this.deferredFunctions[i]);
            }

            this.timeouts          = [];
            this.deferredFunctions = [];

            for (var j = 0; j < curTimeouts.length; j++) {
                this.window.clearInterval(curTimeouts[j]);
                curHandlers[j]();
            }

            // NOTE: Handlers can create new deferred functions.
            return this._callDeferredFunction(fn, args);
        }

        return functionProto.apply(fn, this.window, args);
    }

    attach (window) {
        super.attach(window);

        var timersSandbox = this;

        window.setTimeout = function () {
            // NOTE: shallow-copy the remaining args. Don't use arr.slice(), since it may leak the arguments object.
            // See: https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/arguments
            var args = new Array(arguments.length);

            for (var i = 0; i < args.length; ++i)
                args[i] = arguments[i];

            return functionProto.apply(nativeMethods.setTimeout, window, timersSandbox._wrapTimeoutFunctionsArguments(args));
        };

        window.setInterval = function () {
            // NOTE: shallow-copy the remaining args. Don't use arr.slice(), since it may leak the arguments object.
            // See: https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/arguments
            var args = new Array(arguments.length);

            for (var i = 0; i < args.length; ++i)
                args[i] = arguments[i];

            return functionProto.apply(nativeMethods.setInterval, window, timersSandbox._wrapTimeoutFunctionsArguments(args));
        };

        // NOTE: We are saving the setTimeout wrapper for internal use in case the page-script replaces
        // it with an invalid value.
        this.setTimeout = window.setTimeout;
    }

    deferFunction (fn) {
        var deferredFunction = () => {
            fn();

            for (var i = 0; i < this.deferredFunctions.length; i++) {
                if (this.deferredFunctions[i] === deferredFunction) {
                    arrayProto.splice(this.deferredFunctions, i, 1);
                    arrayProto.splice(this.timeouts, i, 1);

                    break;
                }
            }
        };

        arrayProto.push(this.deferredFunctions, deferredFunction);
        arrayProto.push(this.timeouts, functionProto.call(nativeMethods.setTimeout, window, deferredFunction, 0));
    }
}

