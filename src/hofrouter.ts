import { HofHtmlElement } from "@hofjs/hofjs/lib/esm/hof";

interface RoutesConfig {
    [routeName: string]: RouteConfig
}

interface RouteConfig {
    url: string;
    component: new() => HofHtmlElement;
    params: Object;
    redirect: string;
    aliases: string[];
}

interface Routes {
    [routeName: string]: Route
}

interface Route extends RouteConfig {
    urlRegex: RegExp,
    aliasesRegexes: RegExp[];
    renderElementParent: ShadowRoot;
    renderElementId: string;
}

interface RouteInfo {
    url: string;
    query: string;
    params: Object;
}

interface UrlParams {
    [routeName: string]: string
}

export class HofRouter {
    static initialized: boolean = false;
    static routes: Routes = {};
    static defaultRoute: Route = null;
    static current: RouteInfo = null;

    static _setup() {
        HofRouter.initialized = true;
        window.onload = () => {                 
            HofRouter.processRoute(document.location.href, true, false);

            document.body.addEventListener('click', function(e: MouseEvent) {
                const el = e["path"][0];
                if (el.nodeName == 'A') {
                    e.preventDefault();
                    HofRouter.processRoute(el.attributes[0].nodeValue);
                }
            });
        }
        window.onpopstate = (event: PopStateEvent) => { HofRouter.processRoute(event.state.url, false, false);}
    }

    static _buildRoute(renderElementParent: ShadowRoot, renderElementId: string, config: RouteConfig): Route {
        return {
            url: config.url,
            urlRegex: calculatePathExpression(config.url), // Support shortcut parameter syntax :param
            component: config.component,
            params: config.params,
            redirect: config.redirect,
            aliases: config.aliases,
            aliasesRegexes: config.aliases?.map(alias => calculatePathExpression(alias)),
            renderElementParent, renderElementId
        };

        function calculatePathExpression(path: string): RegExp {
            if (path == "*")
                return new RegExp("^.*$");

            return new RegExp("^" + path.replace(/:([a-zA-Z0-9]+)/, "(?<$1>[\\w-]+)") + "(\\?(?<$routeQuery>.*))?$");
        }
    }

    static configRoutes(renderElementParent: ShadowRoot, renderElementId: string, routeEntries: RoutesConfig) {
        if (!HofRouter.initialized) HofRouter._setup();

        for (const [name, config] of Object.entries(routeEntries)) {
            const route = HofRouter._buildRoute(renderElementParent, renderElementId, config);

            if (config.url == "*") HofRouter.defaultRoute = route;
            else HofRouter.routes[name] = route;
        }
    }

    static _findCurrentView(mountElement: HTMLElement): HofHtmlElement {
        for (const child of Array.from(mountElement.children))
            if (child["style"] && child["style"].display != 'none')
                return child as HofHtmlElement;

        return null;
    }

    static _findNextView(mountElement: HTMLElement, route: Route): HofHtmlElement {
        for (const child of Array.from(mountElement.children))
            if (child instanceof HofHtmlElement && child.getAttribute("router-url") == route.url)
                return child;

        return null;
    }

    static _updateView(view: HofHtmlElement, route: Route, urlParams: UrlParams) {
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

    static _loadView(mountElement: HTMLElement, route: Route, urlParams: UrlParams) {
        const view = new route.component();
        
        // View should be initially hidden
        view.style.display = 'none';

        HofRouter._updateView(view, route, urlParams);

        mountElement.appendChild(view);

        return view;
    }

    static _callBeforeRoutingHook(view: HofHtmlElement, nextUrl: string, currentUrl: string) {
        if (view != null && view["beforeRouting"]) {
            const ret = view["beforeRouting"](nextUrl, currentUrl);
            if (typeof ret != "undefined" && ret == false)
                return false; 
        }

        return true;
    }

    static _callAfterRoutingHook(view: HofHtmlElement, nextUrl: string, currentUrl: string) {
        if (view != null && view["afterRouting"])
            view["afterRouting"](nextUrl, currentUrl);
    }

    static _resolveRouterUrl(url: string) {
        // Sample: <a href="router:pageDetails(id=1, param1=Hello, param2=World)">Details 3</a>

        const paramsStartIndex = url.indexOf("(");
        const paramsEndIndex = url.indexOf(")");
        const routeName = paramsStartIndex == -1 ? url.substring(7) : url.substring(7, paramsStartIndex);
        const parametersExpr = paramsStartIndex == -1 ? "" : url.substring(paramsStartIndex+1, paramsEndIndex);

        // Resolve integrated router functions
        if (routeName == "back") { HofRouter.back(); return null; }
        else if (routeName == "forward") { HofRouter.forward(); return null; }
        else if (routeName == "go") { HofRouter.go(parseInt(parametersExpr)); return null; }
        else if (routeName == "push") { HofRouter.push(parametersExpr); return null; }
        else if (routeName == "replace") { HofRouter.replace(parametersExpr); return null; }

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
        resolvedUrlQuery = resolvedUrlQuery.substring(0, resolvedUrlQuery.length-1);
        resolvedUrl += resolvedUrlQuery;

        return resolvedUrl;
    }

    static _matchRoute(nextUrl: string, route: Route, updateHistory: boolean, addMode: boolean) {
        if (nextUrl.startsWith("router:")) {
            nextUrl = HofRouter._resolveRouterUrl(nextUrl);
            
            // Router action already processed, i.e. no nextUrl
            if (nextUrl == null) return true;
        }

        const match = route.urlRegex.exec(nextUrl)
            ?? route.aliasesRegexes?.map(alias => alias.exec(nextUrl)).find(alias => alias != null);

        if (match != null) {
            if (route.redirect) return true;

            const mountElement = route.renderElementParent.getElementById(route.renderElementId);
            const currentViewComponent = HofRouter._findCurrentView(mountElement);
            const currentUrl = currentViewComponent?.getAttribute("router-url");
            const urlParams = match.groups;
            const nextViewComponent = HofRouter._findNextView(mountElement, route)
                ?? HofRouter._loadView(mountElement, route, urlParams);

            HofRouter._callBeforeRoutingHook(currentViewComponent, nextUrl, currentUrl);
            HofRouter._callBeforeRoutingHook(nextViewComponent, nextUrl, currentUrl);

            if (currentViewComponent)
                currentViewComponent.style.display = 'none';
            nextViewComponent.style.display = '';

            HofRouter._updateView(nextViewComponent, route, urlParams);

            if (updateHistory) {
                if (addMode) history.pushState({ url: nextUrl }, "", nextUrl);                       
                else history.replaceState({ url: nextUrl }, "", nextUrl);                            
            }

            HofRouter._callAfterRoutingHook(currentViewComponent, nextUrl, currentUrl);
            HofRouter._callAfterRoutingHook(nextViewComponent, nextUrl, currentUrl);
            
            return true;
        }

        return false;
    }

    static processRoute(nextUrl: string, updateHistory: boolean = true, addMode: boolean = true) {
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
    static go(delta: number) { history.go(delta); }
    static push(url: string) { HofRouter.processRoute(url, true, true); }
    static replace(url: string) { HofRouter.processRoute(url, true, false); }
}