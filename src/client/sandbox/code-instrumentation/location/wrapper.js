import createPropertyDesc from '../../../utils/create-property-desc';
import { get as getDestLocation, getParsed as getParsedDestLocation } from '../../../utils/destination-location';
import { IFRAME, getProxyUrl, changeDestUrlPart } from '../../../utils/url';
import { getDomain } from '../../../../utils/url';
import { objectStatic, arrayProto } from '../../../../protos';

export default class LocationWrapper {
    constructor (window) {
        var resourceType   = window !== window.top ? IFRAME : null;
        var getHref        = () => window.location.href === 'about:blank' ? 'about:blank' : getDestLocation();
        var getProxiedHref = href => getProxyUrl(href, null, null, null, resourceType);

        objectStatic.defineProperty(this, 'href', createPropertyDesc({
            get: getHref,
            set: href => {
                window.location.href = getProxiedHref(href);

                return href;
            }
        }));

        objectStatic.defineProperty(this, 'search', createPropertyDesc({
            get: () => window.location.search,
            set: search => {
                window.location = changeDestUrlPart(window.location.toString(), 'search', search, resourceType);

                return search;
            }
        }));

        objectStatic.defineProperty(this, 'origin', createPropertyDesc({
            get: () => getDomain(getParsedDestLocation()),
            set: origin => origin
        }));

        objectStatic.defineProperty(this, 'hash', createPropertyDesc({
            get: () => window.location.hash,
            set: hash => window.location.hash = hash
        }));

        arrayProto.forEach(['port', 'host', 'hostname', 'pathname', 'protocol'], prop => {
            objectStatic.defineProperty(this, prop, createPropertyDesc({
                get: () => getParsedDestLocation()[prop],
                set: value => {
                    window.location = changeDestUrlPart(window.location.toString(), prop, value, resourceType);

                    return value;
                }
            }));
        });

        this.assign   = url => window.location.assign(getProxiedHref(url));
        /* eslint-disable hammerhead/proto-methods */
        this.replace  = url => window.location.replace(getProxiedHref(url));
        /* eslint-enable hammerhead/proto-methods */
        this.reload   = forceget => window.location.reload(forceget);
        this.toString = () => getHref();
    }
}
