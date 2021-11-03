# Hof.js router

Hof.js router is a modern routing framework that was designed to be used with [Hof.js](https://github.com/hofjs/hof). It is an open source project of Hof University of Applied Sciences and was created by Prof. Dr. Walter Kern. It is maintained by [Hof.js router contributors](https://github.com/hofjs/hofrouter/graphs/contributors). Contact us if you are a student of Hof University of Applied Sciences and would like to contribute.

## Contact
* Organization: https://www.hof-university.com
* Mail: androidapps@hof-university.de
* Impressum / Imprint: https://www.hof-university.de/impressum.html

## Key features
This framework has the following advantages, among others:
* **Simple plain html and js** because no special components or attributes are required. Regular links can be used and named routes can be called by using a special router protocol.
* **Routing hooks** are supported. This makes it possible to call code before or after routing has occured. It also allows to cancel routing based on conditions - a concept known as guards in other frameworks.
* **Redirects and aliases** are supported. Both delegate to another component. However, redirects change the URL, aliases keep the URL.
* **Nested routing** can be easily achieved to support complex routing scenarios.


## State of this framework

This framework is in early alpha and not production ready. Features can change at any time. Use at your own risk.

## Examples

### Regular routes

```js
component("global-app", {
    construct() {
        HofRouter.configRoutes(this._shadow, 'router', {
            pageOverview: { url: "/page-overview", component: overviewPage },
            pageDetails: { url: "/page-details/:id", component: detailsPage, aliases: ["/pagedetails/:id", "/details/:id"] },
            pageOverview2: { url: "/overview", redirect: "/page-overview" },
            default: { url: "*", redirect: "router:pageOverview" }
        });
    },

    render() {
        return `
            <h1>Routing app (function style)</h1>
            
            <a href="/page-overview">Overview</a>
            <a href="/page-details/1?param1=Hello&param2=World">Details</a>

            <a href="/pagedetails/2?param1=Hello&param2=World">Details 2</a>

            <a href="/details/3?param1=Hello&param2=World">Details 3</a>

            <a href="router:pageDetails(id=4, param1=Hello, param2=World)">Details 4</a>

            <div id="router"></div>                    
        `
    }
})
```

### Hashtag based routes

```js
component("global-app", {
    construct() {
        HofRouter.configRoutes(this._shadow, 'router', {
            pageOverview: { url: "#page-overview", component: overviewPage },
            pageDetails: { url: "#page-details/:id", component: detailsPage, aliases: ["#pagedetails/:id", "#details/:id"] },
            pageOverview2: { url: "#overview", redirect: "#page-overview" },
            default: { url: "*", redirect: "router:pageOverview" }
        });
    },

    render() {
        return `
            <h1>Routing app (function style)</h1>
            
            <a href="#page-overview">Overview</a>
            <a href="#page-details/1?param1=Hello&param2=World">Details</a>

            <a href="#pagedetails/2?param1=Hello&param2=World">Details 2</a>

            <a href="#details/3?param1=Hello&param2=World">Details 3</a>

            <a href="router:pageDetails(id=4, param1=Hello, param2=World)">Details 4</a>

            <div id="router"></div>                    
        `
    }
})
```

### Components

```js
 const overviewPage = component("page-overview", {
    count: 10,

    beforeRouting(newValue, oldValue) {
        // return false;
    },

    afterRouting(newValue, oldValue) {

    },

    render() {
        return () => `<h1>Overview page</h1>
            <div>${new Date()}</div>
        `;
    }
});

const detailsPage = component("page-details", {
    id: 0,

    construct() {
        HofRouter.configRoutes(this._shadow, 'subRouter', {
            tab1: { url: "#page-details/:id/tab1", component: detailsTabPage, params: { tabId: 1 } },
            tab2: { url: "#page-details/:id/tab2", component: detailsTabPage, params: { tabId: 2 } },
        });
    },

    beforeRouting(newValue, oldValue) {
        // return false;
    },

    afterRouting(newValue, oldValue) {

    },

    render() {
        return () => `<h1>Details page</h1>
            <div>Specified id: ${this.id}</div>
            <div>Specified url: ${HofRouter.current.url}</div>
            <div>Specified query: ${HofRouter.current.query}</div>
            <ul>
                <li>param1: ${HofRouter.current.params.param1 || "-"}</li>
                <li>param2: ${HofRouter.current.params.param2 || "-"}</li>
            </ul>

            <h2>Nested routing</h2>
            <a href="#page-details/${this.id}/tab1">Tab 1</a>
            <a href="#page-details/${this.id}/tab2">Tab 2</a>

            <button onclick="${() => HofRouter.go(-1)}">Back</button>
            <button onclick="${() => HofRouter.push('#page-overview')}">Overview</button>

            <a href="router:go(-1)">Back</a>
            <a href="router:push('#pageOverview')">Overview</a>

            <div id="subRouter"></div>
        `;
    }
});

const detailsTabPage = component("page-details-tab", {
    tabId: 0,

    render() {
        return () => `<h1>Tab ${this.tabId}</h1>
            <div>${new Date()}</div>
        `;
    }
});
```

## Installation

Hof.js router can be installed by including the nomodule script file hofrouter.js. Additionally modular js builds are available and a TypeScript version.

This framework can also be installed by using npm.

```
npm install @hofjs/hofrouter
```

This package contains builds in esm, cjs and nomodules formats. While cjs is suitable for server-side JS projects (Node projects), esm is the standard for client-side JS projects. To support older browsers without JS module support or to realize a small web application without requiring JavaScript modules, the nomodules variant can be used.

The following examples show the different import types.

```js
import { HofRouter } from "@hofjs/hofjs-router/lib/esm/hofrouter";
```

```js
const { HofRouter } = require("@hofjs/hofjs-router/lib/cjs/hofrouter");
```

```html
<script src="pathToNodeFolderOfApp/node_modules/@hofjs/hofjs-router/lib/nomodule/hofrouter.js"></script>
```

## Documentation

Due to the early stage of development of this framework, no documentation exists yet. However, since it is very much based on JavaScript and web standards and allows intuitive development, the above explanations are usually sufficient to use all framework features.

You can contribute by sending pull requests to [this repository](https://github.com/hofjs/hofrouter).


## License

Hof.js router is [MIT licensed](./LICENSE.md).