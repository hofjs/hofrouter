# Hof.js router

**Hof.js router** is a **modern routing framework** and part of [Hof.js](https://github.com/hofjs/hof). It is an **open source project of Hof University of Applied Sciences** and **was created by Prof. Dr. Walter Kern**.

Contact us if you are a student of Hof University of Applied Sciences and would like to contribute.

## Contact
* Organization: https://www.hof-university.de
* Mail: hofjs@hof-university.de
* Impressum / Imprint: https://www.hof-university.de/impressum.html

## Key features
This framework has the following advantages, among others:
* **Simple plain html and js** because no special components or attributes are required. Regular links can be used and named routes can be called by using a special router protocol.
* **Routing hooks** are supported. This makes it possible to call code before or after routing has occured. It also allows to cancel routing based on conditions - a concept known as guards in other frameworks.
* **Redirects and aliases** are supported. Both delegate to another component. However, redirects change the URL, aliases keep the URL.
* **Nested routing** can be easily achieved to support complex routing scenarios.


## Examples

### Regular routes

```js
class GlobalApp extends HofHtmlElement {
    constructor() {
        super();
        HofRouter.configRoutes(this._shadow, 'router', {
            pageOverview: { url: "/page-overview", component: PageOverview },
            pageDetails: { url: "/page-details/:id", component: PageDetails, aliases: ["/pagedetails/:id", "/details/:id"] },
            pageOverview2: { url: "/overview", redirect: "/page-overview" },
            default: { url: "*", redirect: "router:pageOverview" }
        });
    }

    templates = html`
        <h1>Routing app (regular routes - requires server!)</h1>
            
        <a href="/page-overview">Overview</a>
        <a href="/page-details/1?param1=Hello&param2=World">Details</a>

        <a href="/pagedetails/2?param1=Hello&param2=World">Details 2</a>

        <a href="/details/3?param1=Hello&param2=World">Details 3</a>

        <a href="router:pageDetails(id=4, param1=Hello, param2=World)">Details 4</a>

        <div id="router"></div>
    `;
}

customElements.define("global-app", GlobalApp);
```

### Hashtag based routes

```js
class GlobalApp extends HofHtmlElement {
    constructor() {
        super();
        HofRouter.configRoutes(this._shadow, 'router', {
            pageOverview: { url: "#page-overview", component: PageOverview },
            pageDetails: { url: "#page-details/:id", component: PageDetails, aliases: ["#pagedetails/:id", "#details/:id"] },
            pageOverview2: { url: "#overview", redirect: "#page-overview" },
            default: { url: "*", redirect: "router:pageOverview" }
        });
    }

    templates = html`
        <h1>Routing app (hashtag routes)</h1>
        <a href="#page-overview">Overview</a>
        <a href="#page-details/1?param1=Hello&param2=World">Details</a>

        <a href="#pagedetails/2?param1=Hello&param2=World">Details 2</a>

        <a href="#details/3?param1=Hello&param2=World">Details 3</a>

        <a href="router:pageDetails(id=4, param1=Hello, param2=World)">Details 4</a>

        <div id="router"></div>
    `;
}

customElements.define("global-app", GlobalApp);
```

### Components

```js
 class PageOverview extends HofHtmlElement {
    count = 10;
    
    beforeRouting(newValue, oldValue) {
        // return false;
    }
    
    afterRouting(newValue, oldValue) {


    }
    
    templates = html`
        <h1>Overview page</h1><div>${new Date()}</div>
    `;
}

customElements.define("page-overview", PageOverview);

class PageDetails extends HofHtmlElement {
    id = 0;

    constructor() {
        super();
        HofRouter.configRoutes(this._shadow, 'subRouter', {
            tab1: { url: "#page-details/:id/tab1", component: PageDetailsTab, params: { tabId: 1 } },
            tab2: { url: "#page-details/:id/tab2", component: PageDetailsTab, params: { tabId: 2 } },
        });
    }

    beforeRouting(newValue, oldValue) {
        // return false;
    }

    afterRouting(newValue, oldValue) {

    }

    templates = html`
        <h1>Details page</h1>
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

customElements.define("page-details", PageDetails);

class PageDetailsTab extends HofHtmlElement {
    tabId = 0;

    templates = html`
        <h1>Tab ${this.tabId}</h1>
        <div>${new Date()}</div>
    `;
}

customElements.define("page-details-tab", PageDetailsTab)
```

## Installation

**Hof.js router can be installed by using npm**.

```
npm install @hofjs/hofrouter
```

This **package contains builds in esm, cjs and nomodules formats**. While cjs is suitable for server-side JS projects (Node projects), esm is the standard for client-side JS projects. To support older browsers without JS module support or to realize a small web application without requiring JavaScript modules, the nomodules variant can be used.

The following examples show the **different import alternatives**.

```js
import { HofRouter } from "pathToNodeFolderOfApp/node_modules/@hofjs/hofjs-router/lib/esm/hofrouter";
```

```js
const { HofRouter } = require("pathToNodeFolderOfApp/node_modules/@hofjs/hofjs-router/lib/cjs/hofrouter");
```

```html
<script src="pathToNodeFolderOfApp/node_modules/@hofjs/hofjs-router/lib/nomodule/hofrouter.js"></script>
```

## Documentation

The documentation with a step-by-step guide can be found at https://github.com/hofjs/hofjs.github.io.

You can contribute by sending pull requests to [this repository](https://github.com/hofjs/hofrouter).


## License

Hof.js router is [MIT licensed](./LICENSE.md).