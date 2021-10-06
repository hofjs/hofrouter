import { HofHtmlElement } from "@hofjs/hofjs/lib/esm/hof";
export class HofRouter {
    static _setup() {
        HofRouter.initialized = true;
        window.onload = () => {
            HofRouter.processRoute(document.location.href, true, false);
            document.body.addEventListener('click', function (e) {
                const el = e["path"][0];
                if (el.nodeName == 'A') {
                    e.preventDefault();
                    HofRouter.processRoute(el.attributes[0].nodeValue);
                }
            });
        };
        window.onpopstate = (event) => { HofRouter.processRoute(event.state.url, false, false); };
    }
    static _buildRoute(renderElementParent, renderElementId, config) {
        var _a;
        return {
            url: config.url,
            urlRegex: calculatePathExpression(config.url),
            component: config.component,
            params: config.params,
            redirect: config.redirect,
            aliases: config.aliases,
            aliasesRegexes: (_a = config.aliases) === null || _a === void 0 ? void 0 : _a.map(alias => calculatePathExpression(alias)),
            renderElementParent, renderElementId
        };
        function calculatePathExpression(path) {
            if (path == "*")
                return new RegExp("^.*$");
            return new RegExp("^" + path.replace(/:([a-zA-Z0-9]+)/, "(?<$1>[\\w-]+)") + "(\\?(?<$routeQuery>.*))?$");
        }
    }
    static configRoutes(renderElementParent, renderElementId, routeEntries) {
        if (!HofRouter.initialized)
            HofRouter._setup();
        for (const [name, config] of Object.entries(routeEntries)) {
            const route = HofRouter._buildRoute(renderElementParent, renderElementId, config);
            if (config.url == "*")
                HofRouter.defaultRoute = route;
            else
                HofRouter.routes[name] = route;
        }
    }
    static _findCurrentView(mountElement) {
        for (const child of Array.from(mountElement.children))
            if (child["style"] && child["style"].display != 'none')
                return child;
        return null;
    }
    static _findNextView(mountElement, route) {
        for (const child of Array.from(mountElement.children))
            if (child instanceof HofHtmlElement && child.getAttribute("router-url") == route.url)
                return child;
        return null;
    }
    static _updateView(view, route, urlParams) {
        // Initialize component with configured parameters
        for (const param in route.params)
            view[param] = route.params[param];
        // Build injectable route object
        const routeInfo = { url: route.url, params: {}, query: "" };
        for (const param in urlParams) {
            if (param == "$routeQuery") {
                if (typeof urlParams[param] != 'undefined') {
                    for (const paramExpr of urlParams[param].split("&")) {
                        const paramNameAndValue = paramExpr.split("=");
                        if (paramNameAndValue.length == 2)
                            routeInfo.params[paramNameAndValue[0]] = paramNameAndValue[1];
                    }
                    routeInfo.query = urlParams[param];
                }
            }
            else
                view[param] = urlParams[param];
        }
        HofRouter.current = routeInfo;
        view.setAttribute("router-url", route.url);
    }
    static _loadView(mountElement, route, urlParams) {
        const view = new route.component();
        // View should be initially hidden
        view.style.display = 'none';
        HofRouter._updateView(view, route, urlParams);
        mountElement.appendChild(view);
        return view;
    }
    static _callBeforeRoutingHook(view, nextUrl, currentUrl) {
        if (view != null && view["beforeRouting"]) {
            const ret = view["beforeRouting"](nextUrl, currentUrl);
            if (typeof ret != "undefined" && ret == false)
                return false;
        }
        return true;
    }
    static _callAfterRoutingHook(view, nextUrl, currentUrl) {
        if (view != null && view["afterRouting"])
            view["afterRouting"](nextUrl, currentUrl);
    }
    static _resolveRouterUrl(url) {
        // Sample: <a href="router:pageDetails(id=1, param1=Hello, param2=World)">Details 3</a>
        const paramsStartIndex = url.indexOf("(");
        const paramsEndIndex = url.indexOf(")");
        const routeName = paramsStartIndex == -1 ? url.substring(7) : url.substring(7, paramsStartIndex);
        const parametersExpr = paramsStartIndex == -1 ? "" : url.substring(paramsStartIndex + 1, paramsEndIndex);
        // Resolve integrated router functions
        if (routeName == "back") {
            HofRouter.back();
            return null;
        }
        else if (routeName == "forward") {
            HofRouter.forward();
            return null;
        }
        else if (routeName == "go") {
            HofRouter.go(parseInt(parametersExpr));
            return null;
        }
        else if (routeName == "push") {
            HofRouter.push(parametersExpr);
            return null;
        }
        else if (routeName == "replace") {
            HofRouter.replace(parametersExpr);
            return null;
        }
        let resolvedUrl = HofRouter.routes[routeName].url;
        let resolvedUrlQuery = "?";
        if (parametersExpr)
            for (const param of parametersExpr.split(",")) {
                let [name, value] = param.trim().split("=");
                if (resolvedUrl.includes(`:${name}`))
                    resolvedUrl = resolvedUrl.replace(`:${name}`, value);
                else
                    resolvedUrlQuery += `${name}=${value}&`;
            }
        resolvedUrlQuery = resolvedUrlQuery.substring(0, resolvedUrlQuery.length - 1);
        resolvedUrl += resolvedUrlQuery;
        return resolvedUrl;
    }
    static _matchRoute(nextUrl, route, updateHistory, addMode) {
        var _a, _b, _c;
        if (nextUrl.startsWith("router:")) {
            nextUrl = HofRouter._resolveRouterUrl(nextUrl);
            // Router action already processed, i.e. no nextUrl
            if (nextUrl == null)
                return true;
        }
        const match = (_a = route.urlRegex.exec(nextUrl)) !== null && _a !== void 0 ? _a : (_b = route.aliasesRegexes) === null || _b === void 0 ? void 0 : _b.map(alias => alias.exec(nextUrl)).find(alias => alias != null);
        if (match != null) {
            if (route.redirect)
                return true;
            const mountElement = route.renderElementParent.getElementById(route.renderElementId);
            const currentViewComponent = HofRouter._findCurrentView(mountElement);
            const currentUrl = currentViewComponent === null || currentViewComponent === void 0 ? void 0 : currentViewComponent.getAttribute("router-url");
            const urlParams = match.groups;
            const nextViewComponent = (_c = HofRouter._findNextView(mountElement, route)) !== null && _c !== void 0 ? _c : HofRouter._loadView(mountElement, route, urlParams);
            HofRouter._callBeforeRoutingHook(currentViewComponent, nextUrl, currentUrl);
            HofRouter._callBeforeRoutingHook(nextViewComponent, nextUrl, currentUrl);
            if (currentViewComponent)
                currentViewComponent.style.display = 'none';
            nextViewComponent.style.display = '';
            HofRouter._updateView(nextViewComponent, route, urlParams);
            if (updateHistory) {
                if (addMode)
                    history.pushState({ url: nextUrl }, "", nextUrl);
                else
                    history.replaceState({ url: nextUrl }, "", nextUrl);
            }
            HofRouter._callAfterRoutingHook(currentViewComponent, nextUrl, currentUrl);
            HofRouter._callAfterRoutingHook(nextViewComponent, nextUrl, currentUrl);
            return true;
        }
        return false;
    }
    static processRoute(nextUrl, updateHistory = true, addMode = true) {
        // Try to match against regular routes
        for (const route of Object.values(HofRouter.routes)) {
            if (HofRouter._matchRoute(nextUrl, route, updateHistory, addMode)) {
                if (route.redirect)
                    HofRouter.processRoute(route.redirect, updateHistory, addMode);
                return;
            }
        }
        // Try to match against default route
        if (HofRouter.defaultRoute && HofRouter._matchRoute(nextUrl, HofRouter.defaultRoute, updateHistory, addMode)) {
            if (HofRouter.defaultRoute.redirect)
                HofRouter.processRoute(HofRouter.defaultRoute.redirect, updateHistory, addMode);
            return;
        }
        // No matching route found
        throw Error(`No matching route definition to resolve url ${nextUrl}!`);
    }
    static back() { history.back(); }
    static forward() { history.forward(); }
    static go(delta) { history.go(delta); }
    static push(url) { HofRouter.processRoute(url, true, true); }
    static replace(url) { HofRouter.processRoute(url, true, false); }
}
HofRouter.initialized = false;
HofRouter.routes = {};
HofRouter.defaultRoute = null;
HofRouter.current = null;
