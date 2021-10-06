import { HofHtmlElement } from "@hofjs/hofjs/lib/esm/hof";
interface RoutesConfig {
    [routeName: string]: RouteConfig;
}
interface RouteConfig {
    url: string;
    component: new () => HofHtmlElement;
    params: Object;
    redirect: string;
    aliases: string[];
}
interface Routes {
    [routeName: string]: Route;
}
interface Route extends RouteConfig {
    urlRegex: RegExp;
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
    [routeName: string]: string;
}
export declare class HofRouter {
    static initialized: boolean;
    static routes: Routes;
    static defaultRoute: Route;
    static current: RouteInfo;
    static _setup(): void;
    static _buildRoute(renderElementParent: ShadowRoot, renderElementId: string, config: RouteConfig): Route;
    static configRoutes(renderElementParent: ShadowRoot, renderElementId: string, routeEntries: RoutesConfig): void;
    static _findCurrentView(mountElement: HTMLElement): HofHtmlElement;
    static _findNextView(mountElement: HTMLElement, route: Route): HofHtmlElement;
    static _updateView(view: HofHtmlElement, route: Route, urlParams: UrlParams): void;
    static _loadView(mountElement: HTMLElement, route: Route, urlParams: UrlParams): HofHtmlElement;
    static _callBeforeRoutingHook(view: HofHtmlElement, nextUrl: string, currentUrl: string): boolean;
    static _callAfterRoutingHook(view: HofHtmlElement, nextUrl: string, currentUrl: string): void;
    static _resolveRouterUrl(url: string): string;
    static _matchRoute(nextUrl: string, route: Route, updateHistory: boolean, addMode: boolean): boolean;
    static processRoute(nextUrl: string, updateHistory?: boolean, addMode?: boolean): void;
    static back(): void;
    static forward(): void;
    static go(delta: number): void;
    static push(url: string): void;
    static replace(url: string): void;
}
export {};
