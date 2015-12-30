import trim from '../../utils/string-trim';
import { regExpProto, stringProto, arrayProto } from '../../protos';

// NOTE: The name/key cannot be empty, but the value can.
const COOKIE_PAIR_REGEX        = /^([^=;]+)\s*=\s*(("?)[^\n\r\0]*\3)/;
const TRAILING_SEMICOLON_REGEX = /;+$/;

export function parse (str) {
    str = trim(str);

    var trailingSemicolonCheck = regExpProto.exec(TRAILING_SEMICOLON_REGEX, str);

    if (trailingSemicolonCheck)
        str = stringProto.slice(str, 0, trailingSemicolonCheck.index);

    var firstSemicolonIdx     = arrayProto.indexOf(str, ';');
    var keyValueString        = firstSemicolonIdx > -1 ? stringProto.substr(str, 0, firstSemicolonIdx) : str;
    var keyValueParsingResult = regExpProto.exec(COOKIE_PAIR_REGEX, keyValueString);

    if (!keyValueParsingResult)
        return null;

    var parsedCookie = {
        key:   keyValueParsingResult[1],
        value: keyValueParsingResult[2]
    };

    parsedCookie.key   = trim(parsedCookie.key);
    parsedCookie.value = trim(parsedCookie.value);

    if (firstSemicolonIdx === -1)
        return parsedCookie;

    var attributesString = trim(stringProto.replace(stringProto.slice(str, firstSemicolonIdx), /^\s*;\s*/, ''));

    if (attributesString.length === 0)
        return parsedCookie;

    var attrValStrings = stringProto.split(attributesString, /\s*;\s*/);

    while (attrValStrings.length) {
        var attrValueStr = arrayProto.shift(attrValStrings);
        var separatorIdx = stringProto.indexOf(attrValueStr, '=');
        var key          = null;
        var value        = null;

        if (separatorIdx === -1)
            key = attrValueStr;
        else {
            key   = stringProto.substr(attrValueStr, 0, separatorIdx);
            value = trim(stringProto.substr(attrValueStr, separatorIdx + 1));
        }

        key = trim(stringProto.toLowerCase(key));

        switch (key) {
            case 'expires':
            case 'max-age':
            case 'path':
                parsedCookie[key] = value;
                break;

            case 'secure':
            case 'httponly':
                parsedCookie[key] = true;
                break;

            case 'domain':
                // NOTE: Remove leading '.'.
                parsedCookie.domain = trim(stringProto.replace(value, /^\./, ''));
                break;

            default:
                break;
        }
    }

    return parsedCookie;
}

export function format (parsedCookie) {
    var cookieStr = parsedCookie.key;

    if (parsedCookie.value !== null)
        cookieStr += '=' + parsedCookie.value;

    cookieStr += ';';

    for (var attrName in parsedCookie) {
        if (parsedCookie.hasOwnProperty(attrName)) {
            if (attrName !== 'key' && attrName !== 'value') {
                cookieStr += attrName;

                // NOTE: Skip attributes without value and boolean attributes (e.g. Secure).
                if (typeof parsedCookie[attrName] !== 'undefined' && parsedCookie[attrName] !== true)
                    cookieStr += '=' + parsedCookie[attrName];

                cookieStr += ';';
            }
        }
    }

    return cookieStr;
}

export function get (document, name) {
    var cookies = stringProto.split(document.cookie, ';');

    for (var i = 0; i < cookies.length; i++) {
        var cookie = trim(cookies[i]);

        if (stringProto.indexOf(cookie, name + '=') === 0 || cookie === name)
            return cookie;
    }

    return null;
}

export function del (document, parsedCookie) {
    parsedCookie.expires = 'Thu, 01 Jan 1970 00:00:01 GMT';
    parsedCookie.value   = '';

    document.cookie = format(parsedCookie);
}
