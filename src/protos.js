// -------------------------------------------------------------
// WARNING: this file is used by both the client and the server.
// Do not use any browser or node-specific API!
// -------------------------------------------------------------
function saveProto (constructor, methods, isStatic) {
    var protoMethods = {};

    for (var i = 0, j = methods.length; i < j; i++) {
        var method = methods[i];

        if (!isStatic && constructor.prototype[method])
            protoMethods[method] = Function.prototype.call.bind(constructor.prototype[method]);
        else if (isStatic && constructor[method])
            protoMethods[method] = constructor[method].bind(constructor);
    }

    return protoMethods;
}

export var stringProto   = saveProto(String, ['charAt', 'charCodeAt', 'concat', 'indexOf', 'lastIndexOf',
    'match', 'replace', 'search', 'slice', 'split', 'substr', 'substring', 'trim', 'toLowerCase', 'toUpperCase']);
export var arrayProto    = saveProto(Array, ['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat', 'join',
    'slice', 'indexOf', 'lastIndexOf', 'filter', 'forEach', 'every', 'map', 'some', 'reduce', 'reduceRight']);
export var numberProto   = saveProto(Number, ['toExponential', 'toFixed', 'toLocaleString', 'toPrecision']);
export var functionProto = saveProto(Function, ['apply', 'call', 'bind']);
export var regExpProto   = saveProto(RegExp, ['exec', 'test']);
export var objectStatic  = saveProto(Object, ['create', 'defineProperty', 'defineProperties', 'keys', 'getPrototypeOf',
    'getOwnPropertyDescriptor', 'getOwnPropertyNames', 'preventExtensions', 'isExtensible', 'seal', 'isSealed', 'freeze', 'isFrozen'], true);
export var dateStatic    = saveProto(Date, ['now'], true);
