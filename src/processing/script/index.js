// -------------------------------------------------------------
// WARNING: this file is used by both the client and the server.
// Do not use any browser or node-specific API!
// -------------------------------------------------------------

import transform from './transform';
import INSTRUCTION from './instruction';
import { HEADER, remove as removeHeader } from './header';
import { parse } from './tools/acorn';
import { generate, Syntax } from './tools/esotope';
import reEscape from '../../utils/regexp-escape';
import getBOM from '../../utils/get-bom';
import { arrayProto, stringProto, regExpProto } from '../../protos';


// Const
const HTML_COMMENT_RE       = /(^|\n)\s*<!--[.\r]*(\n|$)/g;
const OBJECT_RE             = /^\s*\{.*\}\s*$/;
const TRAILING_SEMICOLON_RE = /;\s*$/;
const OBJECT_WRAPPER_RE     = /^\s*\((.*)\);\s*$/;

const PROCESSED_SCRIPT_RE = new RegExp(arrayProto.join([
    reEscape(INSTRUCTION.getLocation),
    reEscape(INSTRUCTION.setLocation),
    reEscape(INSTRUCTION.getProperty),
    reEscape(INSTRUCTION.setProperty),
    reEscape(INSTRUCTION.callMethod),
    reEscape(INSTRUCTION.processScript)
], '|'));


// Code pre/post-processing
function removeHtmlComments (code) {
    // NOTE: The JS parser removes the line that follows'<!--'. (T226589)
    do
        code = stringProto.replace(code, HTML_COMMENT_RE, '\n');
    while (regExpProto.test(HTML_COMMENT_RE, code));

    return code;
}

function preprocess (code) {
    var bom          = getBOM(code);
    var preprocessed = bom ? stringProto.substring(code, bom.length) : code;

    preprocessed = removeHeader(preprocessed);

    return { bom, preprocessed };
}

function postprocess (processed, withHeader, bom) {
    if (withHeader)
        processed = HEADER + processed;

    return bom ? bom + processed : processed;
}


// Parse/generate code
function removeTrailingSemicolonIfNecessary (processed, src) {
    return regExpProto.test(TRAILING_SEMICOLON_RE, src) ? processed : stringProto.replace(processed, TRAILING_SEMICOLON_RE, '');
}

function getAst (src, isObject) {
    // NOTE: In case of objects (e.g.eval('{ 1: 2}')) without wrapping
    // object will be parsed as label. To avoid this we parenthesize src
    src = isObject ? `(${src})` : src;

    try {
        return parse(src, { allowReturnOutsideFunction: true });
    }
    catch (err) {
        return null;
    }
}

function getCode (ast, src, isObject, beautify) {
    var code = generate(ast, {
        format: {
            quotes:     'double',
            escapeless: true,
            compact:    !beautify
        }
    });

    if (isObject)
        code = stringProto.replace(code, OBJECT_WRAPPER_RE, '$1');

    return removeTrailingSemicolonIfNecessary(code, src);
}


// Analyze code
function analyze (code) {
    code = removeHtmlComments(code);

    var isObject = regExpProto.test(OBJECT_RE, code);
    var ast      = getAst(code, isObject);

    // NOTE: `{ var a = 'foo'; }` edge case
    if (!ast && isObject) {
        ast      = getAst(code, false);
        isObject = false;
    }

    return { ast, isObject };
}

function isArrayDataScript (ast) {
    return ast.body.length === 1 &&
           ast.body[0].type === Syntax.ExpressionStatement &&
           ast.body[0].expression.type === Syntax.ArrayExpression;
}


export function isScriptProcessed (code) {
    return regExpProto.test(PROCESSED_SCRIPT_RE, code);
}

export function processScript (src, withHeader, beautify) {
    var { bom, preprocessed } = preprocess(src);
    var { ast, isObject }     = analyze(preprocessed);

    if (!ast)
        return src;

    withHeader = withHeader && !isObject && !isArrayDataScript(ast);

    if (!transform(ast))
        return postprocess(preprocessed, withHeader, bom);

    var processed = getCode(ast, preprocessed, isObject, beautify);

    return postprocess(processed, withHeader, bom);
}
