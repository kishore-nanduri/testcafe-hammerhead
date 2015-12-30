import INTERNAL_ATTRS from '../../processing/dom/internal-attributes';
import SHADOW_UI_CLASSNAME from '../../shadow-ui/class-name';
import nativeMethods from '../sandbox/native-methods';
import domProcessor from '../dom-processor';
import { remove as removeProcessingHeader } from '../../processing/script/header';
import { find } from './dom';
import { convertToProxyUrl } from '../utils/url';
import { stringProto, regExpProto, arrayProto, functionProto } from '../../protos';

const TEXT_NODE_COMMENT_MARKER = 'hammerhead|text-node-comment-marker';

export const INIT_SCRIPT_FOR_IFRAME_TEMPLATE =
    '<script class="' + SHADOW_UI_CLASSNAME.script + '" type="text/javascript">' +
    'var parentHammerhead = null;' +
    'try {' +
    '   parentHammerhead = window.parent["%hammerhead%"];' +
    '} catch(e) {}' +
    'if (parentHammerhead) parentHammerhead.sandbox.onIframeDocumentRecreated(window.frameElement);' +
    'var script = document.currentScript || document.scripts[document.scripts.length - 1];' +
    'script.parentNode.removeChild(script);' +
    '<\/script>';

var htmlDocument = document.implementation.createHTMLDocument('title');
var htmlParser   = htmlDocument.createDocumentFragment();

domProcessor.on(domProcessor.HTML_PROCESSING_REQUIRED_EVENT, (html, callback) => {
    if (!isPageHtml(html))
        html = '<html><body>' + html + '</body></html>';

    callback(processHtml(html));
});

function getHtmlDocument () {
    try {
        // NOTE: IE bug: access denied.
        if (htmlDocument.location)
            htmlDocument.location.toString();
    }
    catch (e) {
        htmlDocument = document.implementation.createHTMLDocument('title');
        htmlParser   = htmlDocument.createDocumentFragment();
    }

    return htmlDocument;
}

export function isPageHtml (html) {
    return regExpProto.test(/^\s*(<\s*(!doctype|html|head|body)[^>]*>)/i, html);
}

function processPageTag (pageTagHtml, process) {
    pageTagHtml = stringProto.replace(pageTagHtml, /^(\s*<\s*)(head|body|html)/i, '$1fakeTagName_$2');

    return stringProto.replace(stringProto.replace(process(pageTagHtml), /<\/fakeTagName_[\s\S]+$/i, ''), /fakeTagName_/i, '');
}

function processPageHtml (html, process) {
    var doctypeRegEx     = /^(\s*<\s*!doctype[^>]*>)([\s\S]*)$/i;
    var headBodyRegEx    = /^(\s*<\s*(head|body)[^>]*>)([\s\S]*?)(<\s*\/(head|body)\s*>\s*)?$/i;
    var htmlContentRegEx = /^(\s*<\s*head[^>]*>)([\s\S]*?)(<\s*\/head\s*>\s*)(<\s*body[^>]*>)([\s\S]*?)(<\s*\/body\s*>\s*)?$/i;
    var htmlRegEx        = /^(\s*<\s*html[^>]*>)([\s\S]*?)(<\s*\/html\s*>\s*)?$/i;

    var doctypeMatches = stringProto.match(html, doctypeRegEx);

    if (doctypeMatches)
        return doctypeMatches[1] + process(doctypeMatches[2]);

    var htmlMatches = stringProto.match(html, htmlRegEx);

    if (htmlMatches) {
        return processPageTag(htmlMatches[1], process) +
               process(htmlMatches[2], 'html') +
               (htmlMatches[3] || '');
    }

    var htmlContentMatches = stringProto.match(html, htmlContentRegEx);

    if (htmlContentMatches) {
        return processPageTag(htmlContentMatches[1], process) +
               process(htmlContentMatches[2], 'head') +
               (htmlContentMatches[3] || '') +
               processPageTag(htmlContentMatches[4], process) +
               process(htmlContentMatches[5], 'body') +
               (htmlContentMatches[6] || '');
    }

    var headBodyMatches = stringProto.match(html, headBodyRegEx);

    if (headBodyMatches) {
        return processPageTag(headBodyMatches[1], process) +
               process(headBodyMatches[3], headBodyMatches[2]) +
               (headBodyMatches[4] || '');
    }
}

function wrapTextNodes (html) {
    var textNodeRegEx = /(<\s*(table|tbody|\/tbody|\/tfoot|\/thead|\/tr|tfoot|thead|tr|\/td)[^>]*>)(\s*[^<\s]+[^<]*)(?=<)/ig;
    var index         = 0;

    return stringProto.replace(html, textNodeRegEx, (str, p1, p2, p3) => {
        var marker = TEXT_NODE_COMMENT_MARKER + (index++).toString();

        return p1 + '<!--' + marker + p3 + marker + '-->';
    });
}

function unwrapTextNodes (html) {
    var i      = 0;
    var marker = '';

    do {
        marker = TEXT_NODE_COMMENT_MARKER + i;
        html   = stringProto.replace(stringProto.replace(html, '<!--' + marker, ''), marker + '-->', '');
    } while (stringProto.indexOf(html, TEXT_NODE_COMMENT_MARKER + ++i) !== -1);

    return html;
}

function processHtmlInternal (html, parentTag, process) {
    html = wrapTextNodes(html);

    var container = getHtmlDocument().createElement('div');

    htmlParser.innerHTML = '';
    functionProto.call(nativeMethods.appendChild, htmlParser, container);

    parentTag = parentTag ? stringProto.toLowerCase(parentTag) : '';

    var isRow    = parentTag === 'tr';
    var isTable  = parentTag === 'table' || parentTag === 'tbody';
    var isScript = parentTag === 'script';

    if (isTable)
        html = '<table>' + html + '</table>';
    else if (isRow)
        html = '<table><tr>' + html + '</tr></table>';
    else if (isScript)
        html = '<script>' + html + '</script>';

    container.innerHTML = html;

    if (process(container))
        html = container.innerHTML;

    if (isTable)
        html = stringProto.replace(html, /^<table>(<tbody>)?|(<\/tbody>)?<\/table>$/ig, '');
    else if (isRow)
        html = stringProto.replace(html, /^<table>(<tbody>)?<tr>|<\/tr>(<\/tbody>)?<\/table>$/ig, '');
    else if (isScript)
        html = stringProto.replace(html, /^<script>|<\/script>$/ig, '');

    return unwrapTextNodes(html);
}

export function cleanUpHtml (html, parentTag) {
    if (isPageHtml(html))
        return processPageHtml(html, cleanUpHtml);

    return processHtmlInternal(html, parentTag, container => {
        var changed = false;

        /*eslint-disable no-loop-func */
        for (var i = 0; i < domProcessor.URL_ATTRS.length; i++) {
            var attr       = domProcessor.URL_ATTRS[i];
            var storedAttr = domProcessor.getStoredAttrName(attr);

            find(container, '[' + storedAttr + ']', el => {
                if (el.hasAttribute(attr)) {
                    functionProto.call(nativeMethods.setAttribute, el, attr, functionProto.call(nativeMethods.getAttribute, el, storedAttr));
                    functionProto.call(nativeMethods.removeAttribute, el, storedAttr);

                    changed = true;
                }
            });
        }
        /*eslint-disable no-loop-func */

        find(container, '[class*="' + SHADOW_UI_CLASSNAME.postfix + '"]', el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
                changed = true;
            }
        });

        find(container, 'script', el => {
            var innerHTML        = el.innerHTML;
            var cleanedInnerHTML = removeProcessingHeader(innerHTML);

            if (innerHTML !== cleanedInnerHTML) {
                el.innerHTML = cleanedInnerHTML;

                changed = true;
            }
        });

        find(container, '[' + INTERNAL_ATTRS.hoverPseudoClass + ']', el => {
            functionProto.call(nativeMethods.removeAttribute, el, INTERNAL_ATTRS.hoverPseudoClass);

            changed = true;
        });

        if (parentTag === 'head' || parentTag === 'body') {
            if (stringProto.indexOf(container.innerHTML, INIT_SCRIPT_FOR_IFRAME_TEMPLATE) !== -1) {
                container.innerHTML = stringProto.replace(container.innerHTML, INIT_SCRIPT_FOR_IFRAME_TEMPLATE, '');

                changed = true;
            }
        }

        return changed;
    });
}

export function processHtml (html, parentTag) {
    if (isPageHtml(html))
        return processPageHtml(html, processHtml);

    return processHtmlInternal(html, parentTag, container => {
        // NOTE: We check this condition to avoid unnecessary calls of the querySelectorAll function.
        if (container.children.length === 1 && container.children[0].children && !container.children[0].children.length)
            domProcessor.processElement(container.children[0], convertToProxyUrl);
        else {
            var children = container.querySelectorAll('*');

            for (var i = 0; i < children.length; i++)
                domProcessor.processElement(children[i], convertToProxyUrl);
        }

        if (parentTag === 'head' || parentTag === 'body')
            container.innerHTML = INIT_SCRIPT_FOR_IFRAME_TEMPLATE + container.innerHTML;

        return true;
    });
}

export function isWellFormattedHtml (html) {
    var tagStack = [];

    // NOTE: http://www.w3.org/TR/html5/syntax.html#void-elements.
    var voidElements = ['area', 'base', 'basefont', 'br', 'col', 'embed', 'frame', 'hr', 'img', 'input', 'keygen', 'isindex', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

    // NOTE: Real cases are very hard - http://www.w3.org/TR/html5/syntax.html#optional-tags Using a simplified
    // algorithm. And going without checking self-closed elements for SVG(http://www.w3.org/TR/SVG/struct.html) and
    // MathML(http://www.w3.org/wiki/MathML/Elements).
    var selfClosedTags = ['colgroup', 'dd', 'dt', 'li', 'options', 'p', 'td', 'tfoot', 'th', 'thead', 'tr'];

    var lastItem      = arr => arr[arr.length - 1];
    var contains      = (arr, item) => arrayProto.indexOf(arr, item) !== -1;
    var parseStartTag = (tag, tagName, attributes, unary) => {
        if (!contains(voidElements, tagName)) {
            if (!unary) {
                tagName = stringProto.toLowerCase(tagName);
                arrayProto.push(tagStack, tagName);
            }
        }
    };

    var parseEndTag = (tag, tagName) => {
        tagName = stringProto.toLowerCase(tagName);

        if (tagName === lastItem(tagStack))
            arrayProto.pop(tagStack);
        else if (contains(selfClosedTags, lastItem(tagStack))) {
            arrayProto.pop(tagStack);
            parseEndTag(tag, tagName);
        }
        else if (contains(voidElements, tagName))
            throw new Error('Empty tags cannot have end-closed tag part');
        else
            throw new Error('Cannot find open tag for ' + lastItem(tagStack));
    };

    var startTagReg = /^<(\w+)([\s\S]*?)(\/?)>/;
    var endTagReg   = /^<\/(\w+)[^>]*>/;
    var doctypeReg  = /^<!doctype[^>]*>/i;

    // NOTE: http://www.w3.org/TR/html5/syntax.html#raw-text-elements.
    var rawTextElements = ['script', 'style'];

    var BEGIN_COMMENT       = '<!--';
    var END_COMMENT         = '-->';
    var BEGIN_TAG           = '<';
    var END_TAG             = '</';
    var DOCTYPE_DECLARATION = '<!';

    var charIndex        = null;
    var isPlanText       = null;
    var match            = null;
    var previousStepHtml = html;
    var wellFormatted    = true;

    try {
        while (html) {
            isPlanText = true;

            // NOTE: Not in a script or style element.
            if (!lastItem(tagStack) || !contains(rawTextElements, lastItem(tagStack))) {
                // html comment
                if (stringProto.indexOf(html, BEGIN_COMMENT) === 0) {
                    charIndex  = stringProto.indexOf(html, END_COMMENT);
                    html       = stringProto.substring(html, charIndex + 3);
                    isPlanText = false;
                }
                // NOTE: Doctype declaration.
                else if (stringProto.indexOf(html, DOCTYPE_DECLARATION) === 0) {
                    match = stringProto.match(html, doctypeReg);

                    if (match) {
                        html       = stringProto.substring(html, match[0].length);
                        isPlanText = false;
                    }
                }
                // NOTE: End tag.
                else if (stringProto.indexOf(html, END_TAG) === 0) {
                    match = stringProto.match(html, endTagReg);

                    if (match) {
                        html       = stringProto.substring(html, match[0].length);
                        stringProto.replace(match[0], endTagReg, parseEndTag);
                        isPlanText = false;
                    }
                }
                else if (stringProto.indexOf(html, BEGIN_TAG) === 0) {
                    match = stringProto.match(html, startTagReg);

                    if (match) {
                        html       = stringProto.substring(html, match[0].length);
                        stringProto.replace(match[0], startTagReg, parseStartTag);
                        isPlanText = false;
                    }
                }

                if (isPlanText) {
                    charIndex = stringProto.indexOf(html, BEGIN_TAG);
                    html      = charIndex === -1 ? '' : stringProto.substring(html, charIndex);
                }
            }
            else {
                var tagContentReg = new RegExp('^([\\s\\S]*?)<\/' + lastItem(tagStack) + '[^>]*>');

                match = stringProto.match(html, tagContentReg);

                if (match) {
                    html = stringProto.substring(html, match[0].length);
                    parseEndTag('', lastItem(tagStack));
                }
                else
                    throw new Error('Cannot process rawTextElement content');
            }

            if (html === previousStepHtml)
                throw new Error('Html parser error');

            previousStepHtml = html;
        }
        if (lastItem(tagStack))
            throw new Error('There are non closed tag -' + lastItem(tagStack));
    }
    catch (err) {
        wellFormatted = false;
    }

    return wellFormatted;
}
