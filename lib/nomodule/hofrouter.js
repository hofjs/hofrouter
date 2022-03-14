(() => {
  // node_modules/@hofjs/hofjs/lib/esm/hof.js
  var AttributeExpression = class {
    constructor(execute, bindVariableNames, template) {
      this.execute = execute;
      this.bindVariableNames = bindVariableNames;
      this.template = template;
    }
  };
  var HofHtmlElement = class extends HTMLElement {
    constructor(tagName = "div") {
      super();
      this._properties = {};
      this._locals = {};
      this._allBindVariables = null;
      this._allBindExpressions = {};
      this._observersForBindVariable = /* @__PURE__ */ new Map();
      this._observerExpressions = /* @__PURE__ */ new Map();
      this._renderIteration = -1;
      this._listTemplate = null;
      this._listData = [];
      this._listIt = "";
      this._listStart = 0;
      this.PROPS_FILTER = (p) => p.charAt(0) != "_" && p != p.toUpperCase() && p != "constructor" && p != "render";
      this.REFERENCED_BIND_VARIABLE_NAMES_REGEX = new RegExp("([a-zA-Z_$][\\w]+\\.[\\w\\.]+)", "g");
      this.DERIVED_PROPERTY_SIGNATURE_REGEX = new RegExp("^function *\\(\\)");
      this._tagName = tagName;
      this._shadow = this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this._root = document.createElement(this._tagName);
      this._shadow.appendChild(this._root);
      this.render();
    }
    useAutoProps() {
      this._forEachPropertyOfObjectAndPrototype((prop, obj) => {
        const initialValue = obj[prop];
        if (prop.startsWith("event-")) {
          prop = prop.substring(6);
          delete obj[prop];
        }
        if (prop == "construct" && typeof initialValue == "function") {
          initialValue.call(this);
        } else
          Object.defineProperty(this, prop, {
            get: function() {
              return this.getProperty(prop, initialValue);
            },
            set: function(v) {
              const oldValue = this.getProperty(prop, initialValue);
              if (this._callBindVariableBeforeChangedHook(this, prop, v, oldValue) && this._callBindVariableBeforePropertyChangedHook(this, prop, "", v, oldValue)) {
                if (Array.isArray(oldValue))
                  this._renderUpdate(v);
                else
                  this.setProperty(prop, v);
                this._callBindVariableAfterPropertyChangedHook(this, prop, "", v, oldValue);
                this._callBindVariableAfterChangedHook(this, prop, v, oldValue);
              }
            },
            enumerable: true,
            configurable: true
          });
      });
    }
    setProperty(name, value) {
      const oldValue = this._properties[name];
      if (typeof oldValue == "object" || typeof value == "object" || oldValue != value || value["lastActionMethod"]) {
        if (!value.lastActionPropertyPath) {
          this._properties[name] = value;
          if (this._allBindVariables)
            this._allBindVariables[name] = value;
          if (this._allBindVariables)
            this._makeBindVariableObservable(name);
        }
      }
      this._updatePropertyObservers([name, value]);
    }
    getProperty(name, initialValue) {
      var _a, _b;
      if (this._allBindVariables)
        return this._allBindVariables[name];
      return (_b = (_a = this._properties[name]) !== null && _a !== void 0 ? _a : this.getAttribute(name)) !== null && _b !== void 0 ? _b : initialValue;
    }
    _hasAlreadyRendered() {
      return this._root.textContent != "";
    }
    renderContent(html, locals = void 0) {
      this._renderFull(html, locals);
    }
    renderList(data, html, locals = void 0) {
      const expression = html.toString();
      const listIt = expression.substring(expression.indexOf("(") + 1, expression.indexOf(")"));
      if (typeof data == "string")
        return;
      this._listData = data;
      this._listIt = listIt;
      this._listTemplate = html;
      this._listStart = this._root.childNodes.length;
      if (typeof locals == "undefined" || locals == null)
        locals = {};
      for (const listItem of this._listData) {
        locals[this._listIt] = listItem;
        locals[this._listIt]._observableUniqueName = this._listIt + (this._renderIteration + 1);
        this._renderFull(html, locals);
      }
    }
    _calculateProperties() {
      let result = {};
      this._forEachPropertyOfObjectAndPrototype((prop, obj) => result[prop] = obj[prop]);
      this._allBindVariables = result;
    }
    _forEachPropertyOfObjectAndPrototype(func) {
      for (const name of Object.getOwnPropertyNames(this).filter(this.PROPS_FILTER))
        func(name, this);
      const prototype = Object.getPrototypeOf(this);
      for (const name of Object.getOwnPropertyNames(prototype).filter(this.PROPS_FILTER))
        func(name, prototype);
    }
    _convertToTemplateExpression(buildFunction) {
      let expression = buildFunction.toString();
      const expressionStart = expression.indexOf("`");
      if (expressionStart > 0)
        expression = expression.substring(expressionStart + 1, expression.length - 1);
      return expression.trim();
    }
    _parseHTML(htmlFunction, locals) {
      const html = this._convertToTemplateExpression(htmlFunction);
      if (this._allBindVariables == null)
        this._calculateProperties();
      const allBindVariables = this._allBindVariables;
      const [template, bindVariableNames] = this._calculateTemplateAndBindVariableNames(html, allBindVariables, locals);
      this._calculateBindings(template, bindVariableNames);
      const parser = new DOMParser();
      const elements = parser.parseFromString(template, "text/html").body.childNodes;
      return [elements, allBindVariables, bindVariableNames];
    }
    _makeBindVariableObservable(bindVariableName) {
      for (const bindingExpression of this._allBindExpressions[bindVariableName])
        this._makeBindVariableStructureObservable(bindVariableName, bindingExpression);
    }
    _makeBindVariableStructureObservable(bindVariableName, bindingExpression) {
      const o = this._allBindVariables[bindVariableName];
      const props = bindingExpression.split(".");
      let propObj = o;
      let propertyPath = bindVariableName;
      for (let i = 0; i < props.length; i++) {
        let lastProp = props[i];
        propertyPath += `.${props[i]}`;
        if (typeof propObj == "undefined")
          return;
        if (typeof propObj == "object") {
          if (!Array.isArray(propObj) && propertyPath.includes(".") && propObj[lastProp].bind) {
            propObj[lastProp] = propObj[lastProp].bind(propObj);
          }
          if (propObj[lastProp]["bind"])
            continue;
          if (!Array.isArray(propObj))
            this._makeObjectObservable(propObj, lastProp, bindVariableName, propertyPath);
          else {
            this._makeArrayObservable(propObj, lastProp, bindVariableName, propertyPath);
          }
        }
        propObj = propObj[props[i]];
      }
    }
    _callBindVariableBeforeChangedHook(obj, prop, newValue, oldValue) {
      const hookMethodName = `${prop}BeforeChanged`;
      if (obj[hookMethodName]) {
        const ret = obj[hookMethodName](newValue, oldValue);
        if (typeof ret != "undefined" && ret == false)
          return false;
        return true;
      }
      return true;
    }
    _callBindVariableAfterChangedHook(obj, prop, newValue, oldValue) {
      const hookMethodName = `${prop}AfterChanged`;
      if (obj[hookMethodName])
        obj[hookMethodName](newValue, oldValue);
    }
    _callBindVariableBeforePropertyChangedHook(obj, prop, subProp, newValue, oldValue) {
      const hookMethodName = `${prop}BeforePropertyChanged`;
      if (obj[hookMethodName]) {
        const ret = obj[hookMethodName](subProp, newValue, oldValue);
        if (typeof ret != "undefined" && ret == false)
          return false;
        return true;
      }
      return true;
    }
    _callBindVariableAfterPropertyChangedHook(obj, prop, subProp, newValue, oldValue) {
      const hookMethodName = `${prop}AfterPropertyChanged`;
      if (obj[hookMethodName])
        obj[hookMethodName](subProp, newValue, oldValue);
    }
    _makeObjectObservable(obj, observerProperty, componentProperty, propertyPath) {
      let _value = obj[observerProperty];
      const self = this;
      if (!this._registerNewObserver(obj, observerProperty, this, componentProperty, propertyPath)) {
        Object.defineProperty(obj, observerProperty, {
          get: function() {
            return _value;
          }.bind(this),
          set: function(v) {
            const newValue = v;
            const oldValue = obj[observerProperty];
            self._applyValueAndNotifyObservers(obj, observerProperty, componentProperty, newValue, oldValue, false, () => _value = v);
          }.bind(this),
          enumerable: true,
          configurable: true
        });
        if (propertyPath.includes(".") && obj[observerProperty].bind) {
          obj[observerProperty] = obj[observerProperty].bind(obj);
        }
      }
    }
    _makeArrayObservable(arr, observerProperty, componentProperty, propertyPath) {
      const self = this;
      if (!this._registerNewObserver(arr, observerProperty, this, componentProperty, propertyPath)) {
        arr._emit = function(index, items, deletedItems, action) {
          if (items.length == 0)
            this.lastActionMethod = "DELETE";
          else if (index == null)
            this.lastActionMethod = "ADD";
          else if (items.length == 1)
            this.lastActionMethod = "EDIT";
          this.lastActionIndex = index !== null && index !== void 0 ? index : this.length;
          const newValue = items[items.length - 1];
          const oldValue = deletedItems[deletedItems.length - 1];
          ;
          this.lastActionObject = newValue !== null && newValue !== void 0 ? newValue : oldValue;
          self._applyValueAndNotifyObservers(this, observerProperty, componentProperty, newValue, oldValue, true, action);
          this.lastActionMethod = null;
          this.lastActionIndex = null;
          this.lastActionObject = null;
          this.lastActionPropertyPath = null;
          return this;
        };
        arr.push = function(...items) {
          arr._emit(null, items, [], () => Array.prototype.push.call(this, ...items));
          return arr.length;
        };
        arr.splice = function(index, deleteCount, ...items) {
          const deletedItems = this.slice(index, index + deleteCount);
          if (deleteCount <= 1)
            arr._emit(index, items, deletedItems, () => Array.prototype.splice.call(this, index, deleteCount, ...items));
          return deletedItems;
        };
        arr.edit = function(index, el) {
          return this.splice(index, 1, el);
        };
        arr.delete = function(index) {
          return this.splice(index, 1);
        };
      }
    }
    _applyValueAndNotifyObservers(obj, observerProperty, componentProperty, newValue, oldValue, arrayNotification, action) {
      const self = this;
      if (!self._callBindVariableBeforeChangedHook(self, componentProperty, self[componentProperty], self[componentProperty]) || !self._callBindVariableBeforePropertyChangedHook(self, componentProperty, observerProperty, newValue, oldValue))
        return;
      action();
      obj._observers.get(observerProperty).forEach((componentDetails, component) => {
        componentDetails.forEach((componentPropertyPaths, componentProperty2) => {
          componentPropertyPaths.forEach((componentPropertyPath) => {
            if (arrayNotification)
              componentPropertyPath = componentPropertyPath.replace(".length", "");
            let bindVariableValue = component.getProperty(componentProperty2, void 0);
            if (bindVariableValue) {
              if (!arrayNotification)
                bindVariableValue.lastActionMethod = "SET";
              if (!component._callBindVariableBeforeChangedHook(component, componentProperty2, component[componentProperty2], component[componentProperty2]) || !component._callBindVariableBeforePropertyChangedHook(component, componentProperty2, componentPropertyPath, newValue, oldValue)) {
                return;
              }
              bindVariableValue.lastActionPropertyPath = componentPropertyPath;
              component.setProperty(componentProperty2, bindVariableValue);
              component._callBindVariableAfterPropertyChangedHook(self, componentProperty2, componentPropertyPath, newValue, oldValue);
              bindVariableValue.lastActionMethod = null;
              bindVariableValue.lastActionPropertyPath = null;
            }
          });
        });
      });
      self._callBindVariableAfterChangedHook(self, componentProperty, self[componentProperty], self[componentProperty]);
    }
    _registerNewObserver(obj, observerProperty, component, componentProperty, componentPropertyPath) {
      let propertyAlreadyObserved = true;
      if (!obj._observers)
        obj._observers = /* @__PURE__ */ new Map();
      if (!obj._observers.has(observerProperty)) {
        obj._observers.set(observerProperty, /* @__PURE__ */ new Map());
        propertyAlreadyObserved = false;
      }
      if (!obj._observers.get(observerProperty).has(component))
        obj._observers.get(observerProperty).set(component, /* @__PURE__ */ new Map());
      if (!obj._observers.get(observerProperty).get(component).has(componentProperty))
        obj._observers.get(observerProperty).get(component).set(componentProperty, []);
      const objObserverList = obj._observers.get(observerProperty).get(component).get(componentProperty);
      if (!objObserverList.includes(componentPropertyPath))
        objObserverList.push(componentPropertyPath);
      return propertyAlreadyObserved;
    }
    _calculateBindings(htmlFunction, bindVariableNames) {
      for (let bindVariableName of bindVariableNames) {
        const regexp = new RegExp(`(${bindVariableName})((\\.[\\w]+)+)`, "g");
        this._allBindExpressions[bindVariableName] = [];
        for (const [, , expression] of htmlFunction.matchAll(regexp)) {
          const expr = expression.substring(1);
          if (!this._allBindExpressions[bindVariableName].includes(expr))
            this._allBindExpressions[bindVariableName].push(expr);
        }
        this._makeBindVariableObservable(bindVariableName);
      }
    }
    _renderFull(htmlFunction, locals) {
      this._locals = locals;
      const [elements, bindVariables, bindVariableNames] = this._parseHTML(htmlFunction, locals);
      const lastExistingElement = this._root.childNodes.length;
      while (elements.length > 0)
        this._root.appendChild(elements[0]);
      for (let index = lastExistingElement; index < this._root.childNodes.length; index++)
        this._processElementBinding(this._root.childNodes[index], bindVariables, bindVariableNames);
    }
    _removeObserversForBindVariable(bindVariableToDelete) {
      if (this._observersForBindVariable.has(bindVariableToDelete))
        for (const [comp] of this._observersForBindVariable.get(bindVariableToDelete)) {
          for (const [attr, expr] of this._observerExpressions.get(comp)) {
            if (expr.bindVariableNames.includes(bindVariableToDelete))
              this._observerExpressions.get(comp).delete(attr);
          }
          if (this._observerExpressions.get(comp).size == 0)
            this._observerExpressions.delete(comp);
        }
      this._observersForBindVariable.delete(bindVariableToDelete);
      delete this._allBindVariables[bindVariableToDelete];
      delete this._allBindExpressions[bindVariableToDelete];
    }
    _renderUpdate(value) {
      if (this._listTemplate != null) {
        this._locals[this._listIt] = this._listData[value.lastActionIndex];
        if (value.lastActionMethod == "DELETE") {
          this._removeObserversForBindVariable(value.lastActionObject._observableUniqueName);
          this._root.childNodes[this._listStart + value.lastActionIndex].remove();
        } else {
          this._locals[this._listIt]._observableUniqueName = this._listIt + (this._renderIteration + 1);
          const [elements, bindVariables, bindVariableNames] = this._parseHTML(this._listTemplate, { [this._listIt]: this._listData[value.lastActionIndex] });
          if (value.lastActionMethod == "ADD") {
            if (this._root.childNodes[value.lastActionIndex])
              this._root.insertBefore(elements[0], this._root.childNodes[this._listStart + value.lastActionIndex - 1].nextSibling);
            else
              this._root.appendChild(elements[0]);
            this._processElementBinding(this._root.childNodes[this._listStart + value.lastActionIndex], bindVariables, bindVariableNames);
          } else if (value.lastActionMethod == "EDIT") {
            this._root.replaceChild(elements[0], this._root.childNodes[this._listStart + value.lastActionIndex]);
            this._processElementBinding(this._root.childNodes[this._listStart + value.lastActionIndex], bindVariables, bindVariableNames);
          }
        }
      }
    }
    _logUpdate(element, name, value) {
      var _a, _b, _c;
      if (value["bind"])
        return;
      if (value.lastActionPropertyPath)
        return;
      console.log(`[${(_a = element.nodeName) !== null && _a !== void 0 ? _a : "TEXT"}]: Update of ${name}: ${(_b = value.lastActionMethod) !== null && _b !== void 0 ? _b : "SET"} ${JSON.stringify((_c = value.lastActionObject) !== null && _c !== void 0 ? _c : value)}`);
    }
    _makeDerivedVariablesObservable(variableName, variableBody, html) {
      if (!this.DERIVED_PROPERTY_SIGNATURE_REGEX.test(variableBody))
        return html;
      let referencedBindVariableNames = "||null";
      for (const [referencedBindVariableName] of variableBody.matchAll(this.REFERENCED_BIND_VARIABLE_NAMES_REGEX))
        referencedBindVariableNames += "||" + referencedBindVariableName;
      return html.replaceAll(`${variableName}`, `(${variableName}()${referencedBindVariableNames})`);
    }
    _calculateTemplateAndBindVariableNames(html, props, locals) {
      this._renderIteration++;
      const bindVariables = Object.keys(props);
      if (locals) {
        for (let [n, v] of Object.entries(locals)) {
          const uniqueBindVariableName = n + this._renderIteration;
          props[uniqueBindVariableName] = v;
          bindVariables.push(uniqueBindVariableName);
          const regexp2 = new RegExp(`(${n.replaceAll("$", "\\$")})([^=-])`, "g");
          for (const [expr, , token] of html.matchAll(regexp2))
            html = html.replace(expr, `${uniqueBindVariableName}${token}`);
          html = this._makeDerivedVariablesObservable(uniqueBindVariableName, v.toString(), html);
        }
      }
      const regexp = new RegExp("(this[\\w$.]*\\.[\\w$]+)([(]?)", "g");
      for (const [, expr, token] of html.matchAll(regexp)) {
        if (token == "(")
          continue;
        const index = expr.indexOf(".") + 1;
        const functionBody = new Function("return " + expr).call(props).toString().replaceAll("this.", expr.substring(index, expr.indexOf(".", index) + 1));
        html = this._makeDerivedVariablesObservable(expr, functionBody, html);
      }
      return [html, bindVariables];
    }
    _processElementBinding(element, bindVariables, bindVariableNames) {
      if ("attributes" in element)
        Array.from(element.attributes).forEach((attr) => {
          if (attr.nodeValue.includes("${"))
            this._processBindingExpression(element, bindVariables, bindVariableNames, attr.nodeName, attr.nodeValue);
        });
      if ("data" in element) {
        if (element.data.includes("${"))
          this._processBindingExpression(element, bindVariables, bindVariableNames, "data", element.data);
      }
      if ("childNodes" in element)
        for (const childElement of Array.from(element.childNodes)) {
          this._processElementBinding(childElement, bindVariables, bindVariableNames);
        }
      if ("_hasAlreadyRendered" in element && !element._hasAlreadyRendered())
        element.render();
    }
    _processBindingExpression(element, bindVariables, bindVariableNames, attr, expr) {
      const attributeExpression = this._buildCallableExpression(attr, expr, bindVariableNames);
      if (!this._observerExpressions.has(element))
        this._observerExpressions.set(element, /* @__PURE__ */ new Map());
      this._observerExpressions.get(element).set(attr, attributeExpression);
      for (let bindVariableName of attributeExpression.bindVariableNames) {
        if (bindVariables[bindVariableName].bind)
          bindVariables[bindVariableName] = bindVariables[bindVariableName].bind(this);
      }
      const bindVariableValues = this._getBindVariableValues(attributeExpression.bindVariableNames);
      const value = attributeExpression.execute(...bindVariableValues);
      element[attr] = value;
      if (!value["bind"])
        this._registerElementAttributeAsObserverForBindVariables(element, attr, bindVariables, attributeExpression.bindVariableNames);
    }
    _buildCallableExpression(attr, expr, bindVariableNames) {
      if (attr == "data" || expr.lastIndexOf("${") > 0 || expr.lastIndexOf("}") < expr.length - 1)
        expr = "`" + expr + "`";
      else
        expr = expr.replaceAll("${", "").replaceAll("}", "");
      let referencedBindVariables = [];
      for (const bindVariableName of bindVariableNames) {
        if (expr.includes(bindVariableName))
          referencedBindVariables.push(bindVariableName);
      }
      return new AttributeExpression(new Function(...referencedBindVariables, "return " + expr).bind(this), referencedBindVariables, expr);
    }
    _registerElementAttributeAsObserverForBindVariables(element, attr, bindVariables, referencedBindVariableNames) {
      for (let bindVariableName of referencedBindVariableNames) {
        if (!this._observersForBindVariable.has(bindVariableName))
          this._observersForBindVariable.set(bindVariableName, /* @__PURE__ */ new Map());
        const variableObservable = this._observersForBindVariable.get(bindVariableName);
        if (!variableObservable.has(element))
          variableObservable.set(element, []);
        if (bindVariables[bindVariableName].bind)
          bindVariables[bindVariableName] = bindVariables[bindVariableName].bind(this);
        variableObservable.get(element).push(attr);
      }
    }
    _getBindVariableValues(bindVariableNames) {
      let result = [];
      for (const b of bindVariableNames)
        result.push(this._allBindVariables[b]);
      return result;
    }
    _updatePropertyObservers(bindVariable) {
      const [bindVariableName, bindVariableValue] = bindVariable;
      if (this._observersForBindVariable.has(bindVariableName)) {
        for (const [element, attrs] of this._observersForBindVariable.get(bindVariableName).entries()) {
          for (const attrName of attrs) {
            const attrExpr = this._observerExpressions.get(element).get(attrName);
            if (!bindVariableValue.lastActionPropertyPath || attrExpr.template.includes(bindVariableValue.lastActionPropertyPath)) {
              const bindVariableValues = this._getBindVariableValues(attrExpr.bindVariableNames);
              const newValue = attrExpr.execute(...bindVariableValues);
              if (typeof newValue.lastActionIndex != "undefined" || !bindVariableValue.lastActionPropertyPath || attrExpr.template && attrExpr.template.includes(bindVariableValue.lastActionPropertyPath)) {
                if (element instanceof HofHtmlElement || element[attrName] != newValue) {
                  element[attrName] = newValue;
                }
              }
            }
          }
        }
      }
    }
  };

  // src/hofrouter.ts
  var _HofRouter = class {
    static _setup() {
      _HofRouter.initialized = true;
      window.onload = () => {
        _HofRouter.processRoute(document.location.href, true, false);
        document.body.addEventListener("click", function(e) {
          const el = e["path"][0];
          if (el.nodeName == "A") {
            e.preventDefault();
            _HofRouter.processRoute(el.attributes[0].nodeValue);
          }
        });
      };
      window.onpopstate = (event) => {
        _HofRouter.processRoute(event.state.url, false, false);
      };
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
        aliasesRegexes: (_a = config.aliases) == null ? void 0 : _a.map((alias) => calculatePathExpression(alias)),
        renderElementParent,
        renderElementId
      };
      function calculatePathExpression(path) {
        if (path == "*")
          return new RegExp("^.*$");
        return new RegExp("^" + path.replace(/:([a-zA-Z0-9]+)/, "(?<$1>[\\w-]+)") + "(\\?(?<$routeQuery>.*))?$");
      }
    }
    static configRoutes(renderElementParent, renderElementId, routeEntries) {
      if (!_HofRouter.initialized)
        _HofRouter._setup();
      for (const [name, config] of Object.entries(routeEntries)) {
        const route = _HofRouter._buildRoute(renderElementParent, renderElementId, config);
        if (config.url == "*")
          _HofRouter.defaultRoute = route;
        else
          _HofRouter.routes[name] = route;
      }
    }
    static _findCurrentView(mountElement) {
      for (const child of Array.from(mountElement.children))
        if (child["style"] && child["style"].display != "none")
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
      for (const param in route.params)
        view[param] = route.params[param];
      const routeInfo = { url: route.url, params: {}, query: "" };
      for (const param in urlParams) {
        if (param == "$routeQuery") {
          if (typeof urlParams[param] != "undefined") {
            for (const paramExpr of urlParams[param].split("&")) {
              const paramNameAndValue = paramExpr.split("=");
              if (paramNameAndValue.length == 2)
                routeInfo.params[paramNameAndValue[0]] = paramNameAndValue[1];
            }
            routeInfo.query = urlParams[param];
          }
        } else
          view[param] = urlParams[param];
      }
      _HofRouter.current = routeInfo;
      view.setAttribute("router-url", route.url);
    }
    static _loadView(mountElement, route, urlParams) {
      const view = new route.component();
      view.style.display = "none";
      _HofRouter._updateView(view, route, urlParams);
      mountElement.appendChild(view);
      view.render();
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
      const paramsStartIndex = url.indexOf("(");
      const paramsEndIndex = url.indexOf(")");
      const routeName = paramsStartIndex == -1 ? url.substring(7) : url.substring(7, paramsStartIndex);
      const parametersExpr = paramsStartIndex == -1 ? "" : url.substring(paramsStartIndex + 1, paramsEndIndex);
      if (routeName == "back") {
        _HofRouter.back();
        return null;
      } else if (routeName == "forward") {
        _HofRouter.forward();
        return null;
      } else if (routeName == "go") {
        _HofRouter.go(parseInt(parametersExpr));
        return null;
      } else if (routeName == "push") {
        _HofRouter.push(parametersExpr);
        return null;
      } else if (routeName == "replace") {
        _HofRouter.replace(parametersExpr);
        return null;
      }
      let resolvedUrl = _HofRouter.routes[routeName].url;
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
        nextUrl = _HofRouter._resolveRouterUrl(nextUrl);
        if (nextUrl == null)
          return true;
      }
      const match = (_b = route.urlRegex.exec(nextUrl)) != null ? _b : (_a = route.aliasesRegexes) == null ? void 0 : _a.map((alias) => alias.exec(nextUrl)).find((alias) => alias != null);
      if (match != null) {
        if (route.redirect)
          return true;
        const mountElement = route.renderElementParent.getElementById(route.renderElementId);
        const currentViewComponent = _HofRouter._findCurrentView(mountElement);
        const currentUrl = currentViewComponent == null ? void 0 : currentViewComponent.getAttribute("router-url");
        const urlParams = match.groups;
        const nextViewComponent = (_c = _HofRouter._findNextView(mountElement, route)) != null ? _c : _HofRouter._loadView(mountElement, route, urlParams);
        _HofRouter._callBeforeRoutingHook(currentViewComponent, nextUrl, currentUrl);
        _HofRouter._callBeforeRoutingHook(nextViewComponent, nextUrl, currentUrl);
        if (currentViewComponent)
          currentViewComponent.style.display = "none";
        nextViewComponent.style.display = "";
        _HofRouter._updateView(nextViewComponent, route, urlParams);
        if (updateHistory) {
          if (addMode)
            history.pushState({ url: nextUrl }, "", nextUrl);
          else
            history.replaceState({ url: nextUrl }, "", nextUrl);
        }
        _HofRouter._callAfterRoutingHook(currentViewComponent, nextUrl, currentUrl);
        _HofRouter._callAfterRoutingHook(nextViewComponent, nextUrl, currentUrl);
        return true;
      }
      return false;
    }
    static processRoute(nextUrl, updateHistory = true, addMode = true) {
      for (const route of Object.values(_HofRouter.routes)) {
        if (_HofRouter._matchRoute(nextUrl, route, updateHistory, addMode)) {
          if (route.redirect)
            _HofRouter.processRoute(route.redirect, updateHistory, addMode);
          return;
        }
      }
      if (_HofRouter.defaultRoute && _HofRouter._matchRoute(nextUrl, _HofRouter.defaultRoute, updateHistory, addMode)) {
        if (_HofRouter.defaultRoute.redirect)
          _HofRouter.processRoute(_HofRouter.defaultRoute.redirect, updateHistory, addMode);
        return;
      }
      throw Error(`No matching route definition to resolve url ${nextUrl}!`);
    }
    static back() {
      history.back();
    }
    static forward() {
      history.forward();
    }
    static go(delta) {
      history.go(delta);
    }
    static push(url) {
      _HofRouter.processRoute(url, true, true);
    }
    static replace(url) {
      _HofRouter.processRoute(url, true, false);
    }
  };
  var HofRouter = _HofRouter;
  HofRouter.initialized = false;
  HofRouter.routes = {};
  HofRouter.defaultRoute = null;
  HofRouter.current = null;

  // src/esbuild-wrapper/hofrouter.esbuild.ts
  window.HofRouter = HofRouter;
})();
