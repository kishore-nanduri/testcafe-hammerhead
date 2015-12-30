import { stringProto, regExpProto } from '../../protos';

function getMSEdgeVersion (userAgent) {
    var edgeStrIndex = stringProto.indexOf(userAgent, 'edge/');

    return parseInt(stringProto.substring(userAgent, edgeStrIndex + 5, stringProto.indexOf(userAgent, '.', edgeStrIndex)), 10);
}

function calculateBrowserAndVersion (userAgent) {
    var webkitRegEx  = /(webkit)[ \/]([\w.]+)/;
    var operaRegEx   = /(opera)(?:.*version)?[ \/]([\w.]+)/;
    var msieRegEx    = /(msie) ([\w.]+)/;
    var firefoxRegEx = /(firefox)/;

    var match = regExpProto.exec(webkitRegEx, userAgent) ||
                regExpProto.exec(operaRegEx, userAgent) ||
                regExpProto.exec(msieRegEx, userAgent) ||
                stringProto.indexOf(userAgent, 'compatible') < 0 && regExpProto.exec(firefoxRegEx, userAgent) ||
                [];

    return {
        name:    match[1] || '',
        version: match[2] || '0'
    };
}

var userAgent           = stringProto.toLowerCase(navigator.userAgent);
var browser             = calculateBrowserAndVersion(userAgent);
var majorBrowserVersion = parseInt(browser.version, 10);

export var isIE11 = regExpProto.test(/trident\/7.0/, userAgent) && !(browser.name === 'msie' &&
                    (majorBrowserVersion === 9 || majorBrowserVersion === 10));

if (isIE11)
    majorBrowserVersion = 11;

export var isAndroid         = regExpProto.test(/android/, userAgent);
export var isMSEdge          = !!regExpProto.test(/edge\//, userAgent);
export var version           = isMSEdge ? getMSEdgeVersion(userAgent) : majorBrowserVersion;
export var isIOS             = regExpProto.test(/(iphone|ipod|ipad)/, userAgent);
export var isIE              = browser.name === 'msie' || isIE11 || isMSEdge;
export var isIE10            = isIE && version === 10;
export var isIE9             = isIE && version === 9;
export var isFirefox         = browser.name === 'firefox' && !isIE11;
export var isOpera           = browser.name === 'opera';
export var isOperaWithWebKit = regExpProto.test(/opr/, userAgent);
export var isSafari          = isIOS || regExpProto.test(/safari/, userAgent) && !regExpProto.test(/chrome/, userAgent);
export var isWebKit          = browser.name === 'webkit' && !isMSEdge;
export var hasTouchEvents    = !!('ontouchstart' in window);
export var isMacPlatform     = regExpProto.test(/^Mac/, navigator.platform);

// NOTE: We need to check touch points only for IE, because it has PointerEvent and MSPointerEvent (IE10, IE11)
// instead of TouchEvent (T109295).
export var isTouchDevice = hasTouchEvents || isIE && (navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0);
