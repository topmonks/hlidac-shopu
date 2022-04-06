(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a3, b2) => {
    for (var prop in b2 || (b2 = {}))
      if (__hasOwnProp.call(b2, prop))
        __defNormalProp(a3, prop, b2[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b2)) {
        if (__propIsEnum.call(b2, prop))
          __defNormalProp(a3, prop, b2[prop]);
      }
    return a3;
  };

  // node_modules/lit-html/lit-html.js
  var t;
  var i = globalThis.trustedTypes;
  var s = i ? i.createPolicy("lit-html", { createHTML: (t4) => t4 }) : void 0;
  var e = `lit$${(Math.random() + "").slice(9)}$`;
  var o = "?" + e;
  var n = `<${o}>`;
  var l = document;
  var h = (t4 = "") => l.createComment(t4);
  var r = (t4) => t4 === null || typeof t4 != "object" && typeof t4 != "function";
  var d = Array.isArray;
  var u = (t4) => {
    var i4;
    return d(t4) || typeof ((i4 = t4) === null || i4 === void 0 ? void 0 : i4[Symbol.iterator]) == "function";
  };
  var c = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
  var v = /-->/g;
  var a = />/g;
  var f = />|[ 	\n\r](?:([^\s"'>=/]+)([ 	\n\r]*=[ 	\n\r]*(?:[^ 	\n\r"'`<>=]|("|')|))|$)/g;
  var _ = /'/g;
  var m = /"/g;
  var g = /^(?:script|style|textarea|title)$/i;
  var p = (t4) => (i4, ...s4) => ({ _$litType$: t4, strings: i4, values: s4 });
  var $ = p(1);
  var y = p(2);
  var b = Symbol.for("lit-noChange");
  var w = Symbol.for("lit-nothing");
  var T = /* @__PURE__ */ new WeakMap();
  var x = (t4, i4, s4) => {
    var e5, o4;
    const n3 = (e5 = s4 == null ? void 0 : s4.renderBefore) !== null && e5 !== void 0 ? e5 : i4;
    let l2 = n3._$litPart$;
    if (l2 === void 0) {
      const t5 = (o4 = s4 == null ? void 0 : s4.renderBefore) !== null && o4 !== void 0 ? o4 : null;
      n3._$litPart$ = l2 = new N(i4.insertBefore(h(), t5), t5, void 0, s4 != null ? s4 : {});
    }
    return l2._$AI(t4), l2;
  };
  var A = l.createTreeWalker(l, 129, null, false);
  var C = (t4, i4) => {
    const o4 = t4.length - 1, l2 = [];
    let h3, r3 = i4 === 2 ? "<svg>" : "", d2 = c;
    for (let i5 = 0; i5 < o4; i5++) {
      const s4 = t4[i5];
      let o5, u5, p2 = -1, $2 = 0;
      for (; $2 < s4.length && (d2.lastIndex = $2, u5 = d2.exec(s4), u5 !== null); )
        $2 = d2.lastIndex, d2 === c ? u5[1] === "!--" ? d2 = v : u5[1] !== void 0 ? d2 = a : u5[2] !== void 0 ? (g.test(u5[2]) && (h3 = RegExp("</" + u5[2], "g")), d2 = f) : u5[3] !== void 0 && (d2 = f) : d2 === f ? u5[0] === ">" ? (d2 = h3 != null ? h3 : c, p2 = -1) : u5[1] === void 0 ? p2 = -2 : (p2 = d2.lastIndex - u5[2].length, o5 = u5[1], d2 = u5[3] === void 0 ? f : u5[3] === '"' ? m : _) : d2 === m || d2 === _ ? d2 = f : d2 === v || d2 === a ? d2 = c : (d2 = f, h3 = void 0);
      const y2 = d2 === f && t4[i5 + 1].startsWith("/>") ? " " : "";
      r3 += d2 === c ? s4 + n : p2 >= 0 ? (l2.push(o5), s4.slice(0, p2) + "$lit$" + s4.slice(p2) + e + y2) : s4 + e + (p2 === -2 ? (l2.push(void 0), i5) : y2);
    }
    const u4 = r3 + (t4[o4] || "<?>") + (i4 === 2 ? "</svg>" : "");
    if (!Array.isArray(t4) || !t4.hasOwnProperty("raw"))
      throw Error("invalid template strings array");
    return [s !== void 0 ? s.createHTML(u4) : u4, l2];
  };
  var E = class {
    constructor({ strings: t4, _$litType$: s4 }, n3) {
      let l2;
      this.parts = [];
      let r3 = 0, d2 = 0;
      const u4 = t4.length - 1, c4 = this.parts, [v2, a3] = C(t4, s4);
      if (this.el = E.createElement(v2, n3), A.currentNode = this.el.content, s4 === 2) {
        const t5 = this.el.content, i4 = t5.firstChild;
        i4.remove(), t5.append(...i4.childNodes);
      }
      for (; (l2 = A.nextNode()) !== null && c4.length < u4; ) {
        if (l2.nodeType === 1) {
          if (l2.hasAttributes()) {
            const t5 = [];
            for (const i4 of l2.getAttributeNames())
              if (i4.endsWith("$lit$") || i4.startsWith(e)) {
                const s5 = a3[d2++];
                if (t5.push(i4), s5 !== void 0) {
                  const t6 = l2.getAttribute(s5.toLowerCase() + "$lit$").split(e), i5 = /([.?@])?(.*)/.exec(s5);
                  c4.push({ type: 1, index: r3, name: i5[2], strings: t6, ctor: i5[1] === "." ? M : i5[1] === "?" ? H : i5[1] === "@" ? I : S });
                } else
                  c4.push({ type: 6, index: r3 });
              }
            for (const i4 of t5)
              l2.removeAttribute(i4);
          }
          if (g.test(l2.tagName)) {
            const t5 = l2.textContent.split(e), s5 = t5.length - 1;
            if (s5 > 0) {
              l2.textContent = i ? i.emptyScript : "";
              for (let i4 = 0; i4 < s5; i4++)
                l2.append(t5[i4], h()), A.nextNode(), c4.push({ type: 2, index: ++r3 });
              l2.append(t5[s5], h());
            }
          }
        } else if (l2.nodeType === 8)
          if (l2.data === o)
            c4.push({ type: 2, index: r3 });
          else {
            let t5 = -1;
            for (; (t5 = l2.data.indexOf(e, t5 + 1)) !== -1; )
              c4.push({ type: 7, index: r3 }), t5 += e.length - 1;
          }
        r3++;
      }
    }
    static createElement(t4, i4) {
      const s4 = l.createElement("template");
      return s4.innerHTML = t4, s4;
    }
  };
  function P(t4, i4, s4 = t4, e5) {
    var o4, n3, l2, h3;
    if (i4 === b)
      return i4;
    let d2 = e5 !== void 0 ? (o4 = s4._$Cl) === null || o4 === void 0 ? void 0 : o4[e5] : s4._$Cu;
    const u4 = r(i4) ? void 0 : i4._$litDirective$;
    return (d2 == null ? void 0 : d2.constructor) !== u4 && ((n3 = d2 == null ? void 0 : d2._$AO) === null || n3 === void 0 || n3.call(d2, false), u4 === void 0 ? d2 = void 0 : (d2 = new u4(t4), d2._$AT(t4, s4, e5)), e5 !== void 0 ? ((l2 = (h3 = s4)._$Cl) !== null && l2 !== void 0 ? l2 : h3._$Cl = [])[e5] = d2 : s4._$Cu = d2), d2 !== void 0 && (i4 = P(t4, d2._$AS(t4, i4.values), d2, e5)), i4;
  }
  var V = class {
    constructor(t4, i4) {
      this.v = [], this._$AN = void 0, this._$AD = t4, this._$AM = i4;
    }
    get parentNode() {
      return this._$AM.parentNode;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    p(t4) {
      var i4;
      const { el: { content: s4 }, parts: e5 } = this._$AD, o4 = ((i4 = t4 == null ? void 0 : t4.creationScope) !== null && i4 !== void 0 ? i4 : l).importNode(s4, true);
      A.currentNode = o4;
      let n3 = A.nextNode(), h3 = 0, r3 = 0, d2 = e5[0];
      for (; d2 !== void 0; ) {
        if (h3 === d2.index) {
          let i5;
          d2.type === 2 ? i5 = new N(n3, n3.nextSibling, this, t4) : d2.type === 1 ? i5 = new d2.ctor(n3, d2.name, d2.strings, this, t4) : d2.type === 6 && (i5 = new L(n3, this, t4)), this.v.push(i5), d2 = e5[++r3];
        }
        h3 !== (d2 == null ? void 0 : d2.index) && (n3 = A.nextNode(), h3++);
      }
      return o4;
    }
    m(t4) {
      let i4 = 0;
      for (const s4 of this.v)
        s4 !== void 0 && (s4.strings !== void 0 ? (s4._$AI(t4, s4, i4), i4 += s4.strings.length - 2) : s4._$AI(t4[i4])), i4++;
    }
  };
  var N = class {
    constructor(t4, i4, s4, e5) {
      var o4;
      this.type = 2, this._$AH = w, this._$AN = void 0, this._$AA = t4, this._$AB = i4, this._$AM = s4, this.options = e5, this._$Cg = (o4 = e5 == null ? void 0 : e5.isConnected) === null || o4 === void 0 || o4;
    }
    get _$AU() {
      var t4, i4;
      return (i4 = (t4 = this._$AM) === null || t4 === void 0 ? void 0 : t4._$AU) !== null && i4 !== void 0 ? i4 : this._$Cg;
    }
    get parentNode() {
      let t4 = this._$AA.parentNode;
      const i4 = this._$AM;
      return i4 !== void 0 && t4.nodeType === 11 && (t4 = i4.parentNode), t4;
    }
    get startNode() {
      return this._$AA;
    }
    get endNode() {
      return this._$AB;
    }
    _$AI(t4, i4 = this) {
      t4 = P(this, t4, i4), r(t4) ? t4 === w || t4 == null || t4 === "" ? (this._$AH !== w && this._$AR(), this._$AH = w) : t4 !== this._$AH && t4 !== b && this.$(t4) : t4._$litType$ !== void 0 ? this.T(t4) : t4.nodeType !== void 0 ? this.k(t4) : u(t4) ? this.S(t4) : this.$(t4);
    }
    A(t4, i4 = this._$AB) {
      return this._$AA.parentNode.insertBefore(t4, i4);
    }
    k(t4) {
      this._$AH !== t4 && (this._$AR(), this._$AH = this.A(t4));
    }
    $(t4) {
      this._$AH !== w && r(this._$AH) ? this._$AA.nextSibling.data = t4 : this.k(l.createTextNode(t4)), this._$AH = t4;
    }
    T(t4) {
      var i4;
      const { values: s4, _$litType$: e5 } = t4, o4 = typeof e5 == "number" ? this._$AC(t4) : (e5.el === void 0 && (e5.el = E.createElement(e5.h, this.options)), e5);
      if (((i4 = this._$AH) === null || i4 === void 0 ? void 0 : i4._$AD) === o4)
        this._$AH.m(s4);
      else {
        const t5 = new V(o4, this), i5 = t5.p(this.options);
        t5.m(s4), this.k(i5), this._$AH = t5;
      }
    }
    _$AC(t4) {
      let i4 = T.get(t4.strings);
      return i4 === void 0 && T.set(t4.strings, i4 = new E(t4)), i4;
    }
    S(t4) {
      d(this._$AH) || (this._$AH = [], this._$AR());
      const i4 = this._$AH;
      let s4, e5 = 0;
      for (const o4 of t4)
        e5 === i4.length ? i4.push(s4 = new N(this.A(h()), this.A(h()), this, this.options)) : s4 = i4[e5], s4._$AI(o4), e5++;
      e5 < i4.length && (this._$AR(s4 && s4._$AB.nextSibling, e5), i4.length = e5);
    }
    _$AR(t4 = this._$AA.nextSibling, i4) {
      var s4;
      for ((s4 = this._$AP) === null || s4 === void 0 || s4.call(this, false, true, i4); t4 && t4 !== this._$AB; ) {
        const i5 = t4.nextSibling;
        t4.remove(), t4 = i5;
      }
    }
    setConnected(t4) {
      var i4;
      this._$AM === void 0 && (this._$Cg = t4, (i4 = this._$AP) === null || i4 === void 0 || i4.call(this, t4));
    }
  };
  var S = class {
    constructor(t4, i4, s4, e5, o4) {
      this.type = 1, this._$AH = w, this._$AN = void 0, this.element = t4, this.name = i4, this._$AM = e5, this.options = o4, s4.length > 2 || s4[0] !== "" || s4[1] !== "" ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = w;
    }
    get tagName() {
      return this.element.tagName;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    _$AI(t4, i4 = this, s4, e5) {
      const o4 = this.strings;
      let n3 = false;
      if (o4 === void 0)
        t4 = P(this, t4, i4, 0), n3 = !r(t4) || t4 !== this._$AH && t4 !== b, n3 && (this._$AH = t4);
      else {
        const e6 = t4;
        let l2, h3;
        for (t4 = o4[0], l2 = 0; l2 < o4.length - 1; l2++)
          h3 = P(this, e6[s4 + l2], i4, l2), h3 === b && (h3 = this._$AH[l2]), n3 || (n3 = !r(h3) || h3 !== this._$AH[l2]), h3 === w ? t4 = w : t4 !== w && (t4 += (h3 != null ? h3 : "") + o4[l2 + 1]), this._$AH[l2] = h3;
      }
      n3 && !e5 && this.C(t4);
    }
    C(t4) {
      t4 === w ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t4 != null ? t4 : "");
    }
  };
  var M = class extends S {
    constructor() {
      super(...arguments), this.type = 3;
    }
    C(t4) {
      this.element[this.name] = t4 === w ? void 0 : t4;
    }
  };
  var k = i ? i.emptyScript : "";
  var H = class extends S {
    constructor() {
      super(...arguments), this.type = 4;
    }
    C(t4) {
      t4 && t4 !== w ? this.element.setAttribute(this.name, k) : this.element.removeAttribute(this.name);
    }
  };
  var I = class extends S {
    constructor(t4, i4, s4, e5, o4) {
      super(t4, i4, s4, e5, o4), this.type = 5;
    }
    _$AI(t4, i4 = this) {
      var s4;
      if ((t4 = (s4 = P(this, t4, i4, 0)) !== null && s4 !== void 0 ? s4 : w) === b)
        return;
      const e5 = this._$AH, o4 = t4 === w && e5 !== w || t4.capture !== e5.capture || t4.once !== e5.once || t4.passive !== e5.passive, n3 = t4 !== w && (e5 === w || o4);
      o4 && this.element.removeEventListener(this.name, this, e5), n3 && this.element.addEventListener(this.name, this, t4), this._$AH = t4;
    }
    handleEvent(t4) {
      var i4, s4;
      typeof this._$AH == "function" ? this._$AH.call((s4 = (i4 = this.options) === null || i4 === void 0 ? void 0 : i4.host) !== null && s4 !== void 0 ? s4 : this.element, t4) : this._$AH.handleEvent(t4);
    }
  };
  var L = class {
    constructor(t4, i4, s4) {
      this.element = t4, this.type = 6, this._$AN = void 0, this._$AM = i4, this.options = s4;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    _$AI(t4) {
      P(this, t4);
    }
  };
  var R = { P: "$lit$", L: e, V: o, I: 1, N: C, R: V, D: u, j: P, H: N, O: S, F: H, B: I, W: M, Z: L };
  var z = window.litHtmlPolyfillSupport;
  z == null || z(E, N), ((t = globalThis.litHtmlVersions) !== null && t !== void 0 ? t : globalThis.litHtmlVersions = []).push("2.2.1");

  // node_modules/@lit/reactive-element/css-tag.js
  var t2 = window.ShadowRoot && (window.ShadyCSS === void 0 || window.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
  var e2 = Symbol();
  var n2 = /* @__PURE__ */ new Map();
  var s2 = class {
    constructor(t4, n3) {
      if (this._$cssResult$ = true, n3 !== e2)
        throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
      this.cssText = t4;
    }
    get styleSheet() {
      let e5 = n2.get(this.cssText);
      return t2 && e5 === void 0 && (n2.set(this.cssText, e5 = new CSSStyleSheet()), e5.replaceSync(this.cssText)), e5;
    }
    toString() {
      return this.cssText;
    }
  };
  var o2 = (t4) => new s2(typeof t4 == "string" ? t4 : t4 + "", e2);
  var r2 = (t4, ...n3) => {
    const o4 = t4.length === 1 ? t4[0] : n3.reduce((e5, n4, s4) => e5 + ((t5) => {
      if (t5._$cssResult$ === true)
        return t5.cssText;
      if (typeof t5 == "number")
        return t5;
      throw Error("Value passed to 'css' function must be a 'css' function result: " + t5 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
    })(n4) + t4[s4 + 1], t4[0]);
    return new s2(o4, e2);
  };

  // node_modules/chart.js/dist/chunks/helpers.segment.js
  var requestAnimFrame = function() {
    if (typeof window === "undefined") {
      return function(callback2) {
        return callback2();
      };
    }
    return window.requestAnimationFrame;
  }();
  function throttled(fn, thisArg, updateFn) {
    const updateArgs = updateFn || ((args2) => Array.prototype.slice.call(args2));
    let ticking = false;
    let args = [];
    return function(...rest) {
      args = updateArgs(rest);
      if (!ticking) {
        ticking = true;
        requestAnimFrame.call(window, () => {
          ticking = false;
          fn.apply(thisArg, args);
        });
      }
    };
  }
  function debounce(fn, delay) {
    let timeout;
    return function(...args) {
      if (delay) {
        clearTimeout(timeout);
        timeout = setTimeout(fn, delay, args);
      } else {
        fn.apply(this, args);
      }
      return delay;
    };
  }
  var _toLeftRightCenter = (align) => align === "start" ? "left" : align === "end" ? "right" : "center";
  var _alignStartEnd = (align, start, end) => align === "start" ? start : align === "end" ? end : (start + end) / 2;
  function noop() {
  }
  var uid = function() {
    let id = 0;
    return function() {
      return id++;
    };
  }();
  function isNullOrUndef(value) {
    return value === null || typeof value === "undefined";
  }
  function isArray(value) {
    if (Array.isArray && Array.isArray(value)) {
      return true;
    }
    const type = Object.prototype.toString.call(value);
    if (type.substr(0, 7) === "[object" && type.substr(-6) === "Array]") {
      return true;
    }
    return false;
  }
  function isObject(value) {
    return value !== null && Object.prototype.toString.call(value) === "[object Object]";
  }
  var isNumberFinite = (value) => (typeof value === "number" || value instanceof Number) && isFinite(+value);
  function finiteOrDefault(value, defaultValue) {
    return isNumberFinite(value) ? value : defaultValue;
  }
  function valueOrDefault(value, defaultValue) {
    return typeof value === "undefined" ? defaultValue : value;
  }
  var toPercentage = (value, dimension) => typeof value === "string" && value.endsWith("%") ? parseFloat(value) / 100 : value / dimension;
  var toDimension = (value, dimension) => typeof value === "string" && value.endsWith("%") ? parseFloat(value) / 100 * dimension : +value;
  function callback(fn, args, thisArg) {
    if (fn && typeof fn.call === "function") {
      return fn.apply(thisArg, args);
    }
  }
  function each(loopable, fn, thisArg, reverse) {
    let i4, len, keys;
    if (isArray(loopable)) {
      len = loopable.length;
      if (reverse) {
        for (i4 = len - 1; i4 >= 0; i4--) {
          fn.call(thisArg, loopable[i4], i4);
        }
      } else {
        for (i4 = 0; i4 < len; i4++) {
          fn.call(thisArg, loopable[i4], i4);
        }
      }
    } else if (isObject(loopable)) {
      keys = Object.keys(loopable);
      len = keys.length;
      for (i4 = 0; i4 < len; i4++) {
        fn.call(thisArg, loopable[keys[i4]], keys[i4]);
      }
    }
  }
  function _elementsEqual(a0, a1) {
    let i4, ilen, v0, v1;
    if (!a0 || !a1 || a0.length !== a1.length) {
      return false;
    }
    for (i4 = 0, ilen = a0.length; i4 < ilen; ++i4) {
      v0 = a0[i4];
      v1 = a1[i4];
      if (v0.datasetIndex !== v1.datasetIndex || v0.index !== v1.index) {
        return false;
      }
    }
    return true;
  }
  function clone$1(source) {
    if (isArray(source)) {
      return source.map(clone$1);
    }
    if (isObject(source)) {
      const target = /* @__PURE__ */ Object.create(null);
      const keys = Object.keys(source);
      const klen = keys.length;
      let k2 = 0;
      for (; k2 < klen; ++k2) {
        target[keys[k2]] = clone$1(source[keys[k2]]);
      }
      return target;
    }
    return source;
  }
  function isValidKey(key) {
    return ["__proto__", "prototype", "constructor"].indexOf(key) === -1;
  }
  function _merger(key, target, source, options) {
    if (!isValidKey(key)) {
      return;
    }
    const tval = target[key];
    const sval = source[key];
    if (isObject(tval) && isObject(sval)) {
      merge(tval, sval, options);
    } else {
      target[key] = clone$1(sval);
    }
  }
  function merge(target, source, options) {
    const sources = isArray(source) ? source : [source];
    const ilen = sources.length;
    if (!isObject(target)) {
      return target;
    }
    options = options || {};
    const merger = options.merger || _merger;
    for (let i4 = 0; i4 < ilen; ++i4) {
      source = sources[i4];
      if (!isObject(source)) {
        continue;
      }
      const keys = Object.keys(source);
      for (let k2 = 0, klen = keys.length; k2 < klen; ++k2) {
        merger(keys[k2], target, source, options);
      }
    }
    return target;
  }
  function mergeIf(target, source) {
    return merge(target, source, { merger: _mergerIf });
  }
  function _mergerIf(key, target, source) {
    if (!isValidKey(key)) {
      return;
    }
    const tval = target[key];
    const sval = source[key];
    if (isObject(tval) && isObject(sval)) {
      mergeIf(tval, sval);
    } else if (!Object.prototype.hasOwnProperty.call(target, key)) {
      target[key] = clone$1(sval);
    }
  }
  var emptyString = "";
  var dot = ".";
  function indexOfDotOrLength(key, start) {
    const idx = key.indexOf(dot, start);
    return idx === -1 ? key.length : idx;
  }
  function resolveObjectKey(obj, key) {
    if (key === emptyString) {
      return obj;
    }
    let pos = 0;
    let idx = indexOfDotOrLength(key, pos);
    while (obj && idx > pos) {
      obj = obj[key.substr(pos, idx - pos)];
      pos = idx + 1;
      idx = indexOfDotOrLength(key, pos);
    }
    return obj;
  }
  function _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  var defined = (value) => typeof value !== "undefined";
  var isFunction = (value) => typeof value === "function";
  var setsEqual = (a3, b2) => {
    if (a3.size !== b2.size) {
      return false;
    }
    for (const item of a3) {
      if (!b2.has(item)) {
        return false;
      }
    }
    return true;
  };
  function _isClickEvent(e5) {
    return e5.type === "mouseup" || e5.type === "click" || e5.type === "contextmenu";
  }
  var PI = Math.PI;
  var TAU = 2 * PI;
  var PITAU = TAU + PI;
  var INFINITY = Number.POSITIVE_INFINITY;
  var RAD_PER_DEG = PI / 180;
  var HALF_PI = PI / 2;
  var QUARTER_PI = PI / 4;
  var TWO_THIRDS_PI = PI * 2 / 3;
  var log10 = Math.log10;
  var sign = Math.sign;
  function niceNum(range) {
    const roundedRange = Math.round(range);
    range = almostEquals(range, roundedRange, range / 1e3) ? roundedRange : range;
    const niceRange = Math.pow(10, Math.floor(log10(range)));
    const fraction = range / niceRange;
    const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    return niceFraction * niceRange;
  }
  function _factorize(value) {
    const result = [];
    const sqrt = Math.sqrt(value);
    let i4;
    for (i4 = 1; i4 < sqrt; i4++) {
      if (value % i4 === 0) {
        result.push(i4);
        result.push(value / i4);
      }
    }
    if (sqrt === (sqrt | 0)) {
      result.push(sqrt);
    }
    result.sort((a3, b2) => a3 - b2).pop();
    return result;
  }
  function isNumber(n3) {
    return !isNaN(parseFloat(n3)) && isFinite(n3);
  }
  function almostEquals(x2, y2, epsilon) {
    return Math.abs(x2 - y2) < epsilon;
  }
  function almostWhole(x2, epsilon) {
    const rounded = Math.round(x2);
    return rounded - epsilon <= x2 && rounded + epsilon >= x2;
  }
  function _setMinAndMaxByKey(array, target, property) {
    let i4, ilen, value;
    for (i4 = 0, ilen = array.length; i4 < ilen; i4++) {
      value = array[i4][property];
      if (!isNaN(value)) {
        target.min = Math.min(target.min, value);
        target.max = Math.max(target.max, value);
      }
    }
  }
  function toRadians(degrees) {
    return degrees * (PI / 180);
  }
  function toDegrees(radians) {
    return radians * (180 / PI);
  }
  function _decimalPlaces(x2) {
    if (!isNumberFinite(x2)) {
      return;
    }
    let e5 = 1;
    let p2 = 0;
    while (Math.round(x2 * e5) / e5 !== x2) {
      e5 *= 10;
      p2++;
    }
    return p2;
  }
  function getAngleFromPoint(centrePoint, anglePoint) {
    const distanceFromXCenter = anglePoint.x - centrePoint.x;
    const distanceFromYCenter = anglePoint.y - centrePoint.y;
    const radialDistanceFromCenter = Math.sqrt(distanceFromXCenter * distanceFromXCenter + distanceFromYCenter * distanceFromYCenter);
    let angle = Math.atan2(distanceFromYCenter, distanceFromXCenter);
    if (angle < -0.5 * PI) {
      angle += TAU;
    }
    return {
      angle,
      distance: radialDistanceFromCenter
    };
  }
  function distanceBetweenPoints(pt1, pt2) {
    return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
  }
  function _angleDiff(a3, b2) {
    return (a3 - b2 + PITAU) % TAU - PI;
  }
  function _normalizeAngle(a3) {
    return (a3 % TAU + TAU) % TAU;
  }
  function _angleBetween(angle, start, end, sameAngleIsFullCircle) {
    const a3 = _normalizeAngle(angle);
    const s4 = _normalizeAngle(start);
    const e5 = _normalizeAngle(end);
    const angleToStart = _normalizeAngle(s4 - a3);
    const angleToEnd = _normalizeAngle(e5 - a3);
    const startToAngle = _normalizeAngle(a3 - s4);
    const endToAngle = _normalizeAngle(a3 - e5);
    return a3 === s4 || a3 === e5 || sameAngleIsFullCircle && s4 === e5 || angleToStart > angleToEnd && startToAngle < endToAngle;
  }
  function _limitValue(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function _int16Range(value) {
    return _limitValue(value, -32768, 32767);
  }
  function _isBetween(value, start, end, epsilon = 1e-6) {
    return value >= Math.min(start, end) - epsilon && value <= Math.max(start, end) + epsilon;
  }
  var atEdge = (t4) => t4 === 0 || t4 === 1;
  var elasticIn = (t4, s4, p2) => -(Math.pow(2, 10 * (t4 -= 1)) * Math.sin((t4 - s4) * TAU / p2));
  var elasticOut = (t4, s4, p2) => Math.pow(2, -10 * t4) * Math.sin((t4 - s4) * TAU / p2) + 1;
  var effects = {
    linear: (t4) => t4,
    easeInQuad: (t4) => t4 * t4,
    easeOutQuad: (t4) => -t4 * (t4 - 2),
    easeInOutQuad: (t4) => (t4 /= 0.5) < 1 ? 0.5 * t4 * t4 : -0.5 * (--t4 * (t4 - 2) - 1),
    easeInCubic: (t4) => t4 * t4 * t4,
    easeOutCubic: (t4) => (t4 -= 1) * t4 * t4 + 1,
    easeInOutCubic: (t4) => (t4 /= 0.5) < 1 ? 0.5 * t4 * t4 * t4 : 0.5 * ((t4 -= 2) * t4 * t4 + 2),
    easeInQuart: (t4) => t4 * t4 * t4 * t4,
    easeOutQuart: (t4) => -((t4 -= 1) * t4 * t4 * t4 - 1),
    easeInOutQuart: (t4) => (t4 /= 0.5) < 1 ? 0.5 * t4 * t4 * t4 * t4 : -0.5 * ((t4 -= 2) * t4 * t4 * t4 - 2),
    easeInQuint: (t4) => t4 * t4 * t4 * t4 * t4,
    easeOutQuint: (t4) => (t4 -= 1) * t4 * t4 * t4 * t4 + 1,
    easeInOutQuint: (t4) => (t4 /= 0.5) < 1 ? 0.5 * t4 * t4 * t4 * t4 * t4 : 0.5 * ((t4 -= 2) * t4 * t4 * t4 * t4 + 2),
    easeInSine: (t4) => -Math.cos(t4 * HALF_PI) + 1,
    easeOutSine: (t4) => Math.sin(t4 * HALF_PI),
    easeInOutSine: (t4) => -0.5 * (Math.cos(PI * t4) - 1),
    easeInExpo: (t4) => t4 === 0 ? 0 : Math.pow(2, 10 * (t4 - 1)),
    easeOutExpo: (t4) => t4 === 1 ? 1 : -Math.pow(2, -10 * t4) + 1,
    easeInOutExpo: (t4) => atEdge(t4) ? t4 : t4 < 0.5 ? 0.5 * Math.pow(2, 10 * (t4 * 2 - 1)) : 0.5 * (-Math.pow(2, -10 * (t4 * 2 - 1)) + 2),
    easeInCirc: (t4) => t4 >= 1 ? t4 : -(Math.sqrt(1 - t4 * t4) - 1),
    easeOutCirc: (t4) => Math.sqrt(1 - (t4 -= 1) * t4),
    easeInOutCirc: (t4) => (t4 /= 0.5) < 1 ? -0.5 * (Math.sqrt(1 - t4 * t4) - 1) : 0.5 * (Math.sqrt(1 - (t4 -= 2) * t4) + 1),
    easeInElastic: (t4) => atEdge(t4) ? t4 : elasticIn(t4, 0.075, 0.3),
    easeOutElastic: (t4) => atEdge(t4) ? t4 : elasticOut(t4, 0.075, 0.3),
    easeInOutElastic(t4) {
      const s4 = 0.1125;
      const p2 = 0.45;
      return atEdge(t4) ? t4 : t4 < 0.5 ? 0.5 * elasticIn(t4 * 2, s4, p2) : 0.5 + 0.5 * elasticOut(t4 * 2 - 1, s4, p2);
    },
    easeInBack(t4) {
      const s4 = 1.70158;
      return t4 * t4 * ((s4 + 1) * t4 - s4);
    },
    easeOutBack(t4) {
      const s4 = 1.70158;
      return (t4 -= 1) * t4 * ((s4 + 1) * t4 + s4) + 1;
    },
    easeInOutBack(t4) {
      let s4 = 1.70158;
      if ((t4 /= 0.5) < 1) {
        return 0.5 * (t4 * t4 * (((s4 *= 1.525) + 1) * t4 - s4));
      }
      return 0.5 * ((t4 -= 2) * t4 * (((s4 *= 1.525) + 1) * t4 + s4) + 2);
    },
    easeInBounce: (t4) => 1 - effects.easeOutBounce(1 - t4),
    easeOutBounce(t4) {
      const m3 = 7.5625;
      const d2 = 2.75;
      if (t4 < 1 / d2) {
        return m3 * t4 * t4;
      }
      if (t4 < 2 / d2) {
        return m3 * (t4 -= 1.5 / d2) * t4 + 0.75;
      }
      if (t4 < 2.5 / d2) {
        return m3 * (t4 -= 2.25 / d2) * t4 + 0.9375;
      }
      return m3 * (t4 -= 2.625 / d2) * t4 + 0.984375;
    },
    easeInOutBounce: (t4) => t4 < 0.5 ? effects.easeInBounce(t4 * 2) * 0.5 : effects.easeOutBounce(t4 * 2 - 1) * 0.5 + 0.5
  };
  var map = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, a: 10, b: 11, c: 12, d: 13, e: 14, f: 15 };
  var hex = "0123456789ABCDEF";
  var h1 = (b2) => hex[b2 & 15];
  var h2 = (b2) => hex[(b2 & 240) >> 4] + hex[b2 & 15];
  var eq = (b2) => (b2 & 240) >> 4 === (b2 & 15);
  function isShort(v2) {
    return eq(v2.r) && eq(v2.g) && eq(v2.b) && eq(v2.a);
  }
  function hexParse(str) {
    var len = str.length;
    var ret;
    if (str[0] === "#") {
      if (len === 4 || len === 5) {
        ret = {
          r: 255 & map[str[1]] * 17,
          g: 255 & map[str[2]] * 17,
          b: 255 & map[str[3]] * 17,
          a: len === 5 ? map[str[4]] * 17 : 255
        };
      } else if (len === 7 || len === 9) {
        ret = {
          r: map[str[1]] << 4 | map[str[2]],
          g: map[str[3]] << 4 | map[str[4]],
          b: map[str[5]] << 4 | map[str[6]],
          a: len === 9 ? map[str[7]] << 4 | map[str[8]] : 255
        };
      }
    }
    return ret;
  }
  function hexString(v2) {
    var f3 = isShort(v2) ? h1 : h2;
    return v2 ? "#" + f3(v2.r) + f3(v2.g) + f3(v2.b) + (v2.a < 255 ? f3(v2.a) : "") : v2;
  }
  function round(v2) {
    return v2 + 0.5 | 0;
  }
  var lim = (v2, l2, h3) => Math.max(Math.min(v2, h3), l2);
  function p2b(v2) {
    return lim(round(v2 * 2.55), 0, 255);
  }
  function n2b(v2) {
    return lim(round(v2 * 255), 0, 255);
  }
  function b2n(v2) {
    return lim(round(v2 / 2.55) / 100, 0, 1);
  }
  function n2p(v2) {
    return lim(round(v2 * 100), 0, 100);
  }
  var RGB_RE = /^rgba?\(\s*([-+.\d]+)(%)?[\s,]+([-+.e\d]+)(%)?[\s,]+([-+.e\d]+)(%)?(?:[\s,/]+([-+.e\d]+)(%)?)?\s*\)$/;
  function rgbParse(str) {
    const m3 = RGB_RE.exec(str);
    let a3 = 255;
    let r3, g2, b2;
    if (!m3) {
      return;
    }
    if (m3[7] !== r3) {
      const v2 = +m3[7];
      a3 = 255 & (m3[8] ? p2b(v2) : v2 * 255);
    }
    r3 = +m3[1];
    g2 = +m3[3];
    b2 = +m3[5];
    r3 = 255 & (m3[2] ? p2b(r3) : r3);
    g2 = 255 & (m3[4] ? p2b(g2) : g2);
    b2 = 255 & (m3[6] ? p2b(b2) : b2);
    return {
      r: r3,
      g: g2,
      b: b2,
      a: a3
    };
  }
  function rgbString(v2) {
    return v2 && (v2.a < 255 ? `rgba(${v2.r}, ${v2.g}, ${v2.b}, ${b2n(v2.a)})` : `rgb(${v2.r}, ${v2.g}, ${v2.b})`);
  }
  var HUE_RE = /^(hsla?|hwb|hsv)\(\s*([-+.e\d]+)(?:deg)?[\s,]+([-+.e\d]+)%[\s,]+([-+.e\d]+)%(?:[\s,]+([-+.e\d]+)(%)?)?\s*\)$/;
  function hsl2rgbn(h3, s4, l2) {
    const a3 = s4 * Math.min(l2, 1 - l2);
    const f3 = (n3, k2 = (n3 + h3 / 30) % 12) => l2 - a3 * Math.max(Math.min(k2 - 3, 9 - k2, 1), -1);
    return [f3(0), f3(8), f3(4)];
  }
  function hsv2rgbn(h3, s4, v2) {
    const f3 = (n3, k2 = (n3 + h3 / 60) % 6) => v2 - v2 * s4 * Math.max(Math.min(k2, 4 - k2, 1), 0);
    return [f3(5), f3(3), f3(1)];
  }
  function hwb2rgbn(h3, w2, b2) {
    const rgb = hsl2rgbn(h3, 1, 0.5);
    let i4;
    if (w2 + b2 > 1) {
      i4 = 1 / (w2 + b2);
      w2 *= i4;
      b2 *= i4;
    }
    for (i4 = 0; i4 < 3; i4++) {
      rgb[i4] *= 1 - w2 - b2;
      rgb[i4] += w2;
    }
    return rgb;
  }
  function rgb2hsl(v2) {
    const range = 255;
    const r3 = v2.r / range;
    const g2 = v2.g / range;
    const b2 = v2.b / range;
    const max = Math.max(r3, g2, b2);
    const min = Math.min(r3, g2, b2);
    const l2 = (max + min) / 2;
    let h3, s4, d2;
    if (max !== min) {
      d2 = max - min;
      s4 = l2 > 0.5 ? d2 / (2 - max - min) : d2 / (max + min);
      h3 = max === r3 ? (g2 - b2) / d2 + (g2 < b2 ? 6 : 0) : max === g2 ? (b2 - r3) / d2 + 2 : (r3 - g2) / d2 + 4;
      h3 = h3 * 60 + 0.5;
    }
    return [h3 | 0, s4 || 0, l2];
  }
  function calln(f3, a3, b2, c4) {
    return (Array.isArray(a3) ? f3(a3[0], a3[1], a3[2]) : f3(a3, b2, c4)).map(n2b);
  }
  function hsl2rgb(h3, s4, l2) {
    return calln(hsl2rgbn, h3, s4, l2);
  }
  function hwb2rgb(h3, w2, b2) {
    return calln(hwb2rgbn, h3, w2, b2);
  }
  function hsv2rgb(h3, s4, v2) {
    return calln(hsv2rgbn, h3, s4, v2);
  }
  function hue(h3) {
    return (h3 % 360 + 360) % 360;
  }
  function hueParse(str) {
    const m3 = HUE_RE.exec(str);
    let a3 = 255;
    let v2;
    if (!m3) {
      return;
    }
    if (m3[5] !== v2) {
      a3 = m3[6] ? p2b(+m3[5]) : n2b(+m3[5]);
    }
    const h3 = hue(+m3[2]);
    const p1 = +m3[3] / 100;
    const p2 = +m3[4] / 100;
    if (m3[1] === "hwb") {
      v2 = hwb2rgb(h3, p1, p2);
    } else if (m3[1] === "hsv") {
      v2 = hsv2rgb(h3, p1, p2);
    } else {
      v2 = hsl2rgb(h3, p1, p2);
    }
    return {
      r: v2[0],
      g: v2[1],
      b: v2[2],
      a: a3
    };
  }
  function rotate(v2, deg) {
    var h3 = rgb2hsl(v2);
    h3[0] = hue(h3[0] + deg);
    h3 = hsl2rgb(h3);
    v2.r = h3[0];
    v2.g = h3[1];
    v2.b = h3[2];
  }
  function hslString(v2) {
    if (!v2) {
      return;
    }
    const a3 = rgb2hsl(v2);
    const h3 = a3[0];
    const s4 = n2p(a3[1]);
    const l2 = n2p(a3[2]);
    return v2.a < 255 ? `hsla(${h3}, ${s4}%, ${l2}%, ${b2n(v2.a)})` : `hsl(${h3}, ${s4}%, ${l2}%)`;
  }
  var map$1 = {
    x: "dark",
    Z: "light",
    Y: "re",
    X: "blu",
    W: "gr",
    V: "medium",
    U: "slate",
    A: "ee",
    T: "ol",
    S: "or",
    B: "ra",
    C: "lateg",
    D: "ights",
    R: "in",
    Q: "turquois",
    E: "hi",
    P: "ro",
    O: "al",
    N: "le",
    M: "de",
    L: "yello",
    F: "en",
    K: "ch",
    G: "arks",
    H: "ea",
    I: "ightg",
    J: "wh"
  };
  var names = {
    OiceXe: "f0f8ff",
    antiquewEte: "faebd7",
    aqua: "ffff",
    aquamarRe: "7fffd4",
    azuY: "f0ffff",
    beige: "f5f5dc",
    bisque: "ffe4c4",
    black: "0",
    blanKedOmond: "ffebcd",
    Xe: "ff",
    XeviTet: "8a2be2",
    bPwn: "a52a2a",
    burlywood: "deb887",
    caMtXe: "5f9ea0",
    KartYuse: "7fff00",
    KocTate: "d2691e",
    cSO: "ff7f50",
    cSnflowerXe: "6495ed",
    cSnsilk: "fff8dc",
    crimson: "dc143c",
    cyan: "ffff",
    xXe: "8b",
    xcyan: "8b8b",
    xgTMnPd: "b8860b",
    xWay: "a9a9a9",
    xgYF: "6400",
    xgYy: "a9a9a9",
    xkhaki: "bdb76b",
    xmagFta: "8b008b",
    xTivegYF: "556b2f",
    xSange: "ff8c00",
    xScEd: "9932cc",
    xYd: "8b0000",
    xsOmon: "e9967a",
    xsHgYF: "8fbc8f",
    xUXe: "483d8b",
    xUWay: "2f4f4f",
    xUgYy: "2f4f4f",
    xQe: "ced1",
    xviTet: "9400d3",
    dAppRk: "ff1493",
    dApskyXe: "bfff",
    dimWay: "696969",
    dimgYy: "696969",
    dodgerXe: "1e90ff",
    fiYbrick: "b22222",
    flSOwEte: "fffaf0",
    foYstWAn: "228b22",
    fuKsia: "ff00ff",
    gaRsbSo: "dcdcdc",
    ghostwEte: "f8f8ff",
    gTd: "ffd700",
    gTMnPd: "daa520",
    Way: "808080",
    gYF: "8000",
    gYFLw: "adff2f",
    gYy: "808080",
    honeyMw: "f0fff0",
    hotpRk: "ff69b4",
    RdianYd: "cd5c5c",
    Rdigo: "4b0082",
    ivSy: "fffff0",
    khaki: "f0e68c",
    lavFMr: "e6e6fa",
    lavFMrXsh: "fff0f5",
    lawngYF: "7cfc00",
    NmoncEffon: "fffacd",
    ZXe: "add8e6",
    ZcSO: "f08080",
    Zcyan: "e0ffff",
    ZgTMnPdLw: "fafad2",
    ZWay: "d3d3d3",
    ZgYF: "90ee90",
    ZgYy: "d3d3d3",
    ZpRk: "ffb6c1",
    ZsOmon: "ffa07a",
    ZsHgYF: "20b2aa",
    ZskyXe: "87cefa",
    ZUWay: "778899",
    ZUgYy: "778899",
    ZstAlXe: "b0c4de",
    ZLw: "ffffe0",
    lime: "ff00",
    limegYF: "32cd32",
    lRF: "faf0e6",
    magFta: "ff00ff",
    maPon: "800000",
    VaquamarRe: "66cdaa",
    VXe: "cd",
    VScEd: "ba55d3",
    VpurpN: "9370db",
    VsHgYF: "3cb371",
    VUXe: "7b68ee",
    VsprRggYF: "fa9a",
    VQe: "48d1cc",
    VviTetYd: "c71585",
    midnightXe: "191970",
    mRtcYam: "f5fffa",
    mistyPse: "ffe4e1",
    moccasR: "ffe4b5",
    navajowEte: "ffdead",
    navy: "80",
    Tdlace: "fdf5e6",
    Tive: "808000",
    TivedBb: "6b8e23",
    Sange: "ffa500",
    SangeYd: "ff4500",
    ScEd: "da70d6",
    pOegTMnPd: "eee8aa",
    pOegYF: "98fb98",
    pOeQe: "afeeee",
    pOeviTetYd: "db7093",
    papayawEp: "ffefd5",
    pHKpuff: "ffdab9",
    peru: "cd853f",
    pRk: "ffc0cb",
    plum: "dda0dd",
    powMrXe: "b0e0e6",
    purpN: "800080",
    YbeccapurpN: "663399",
    Yd: "ff0000",
    Psybrown: "bc8f8f",
    PyOXe: "4169e1",
    saddNbPwn: "8b4513",
    sOmon: "fa8072",
    sandybPwn: "f4a460",
    sHgYF: "2e8b57",
    sHshell: "fff5ee",
    siFna: "a0522d",
    silver: "c0c0c0",
    skyXe: "87ceeb",
    UXe: "6a5acd",
    UWay: "708090",
    UgYy: "708090",
    snow: "fffafa",
    sprRggYF: "ff7f",
    stAlXe: "4682b4",
    tan: "d2b48c",
    teO: "8080",
    tEstN: "d8bfd8",
    tomato: "ff6347",
    Qe: "40e0d0",
    viTet: "ee82ee",
    JHt: "f5deb3",
    wEte: "ffffff",
    wEtesmoke: "f5f5f5",
    Lw: "ffff00",
    LwgYF: "9acd32"
  };
  function unpack() {
    const unpacked = {};
    const keys = Object.keys(names);
    const tkeys = Object.keys(map$1);
    let i4, j, k2, ok, nk;
    for (i4 = 0; i4 < keys.length; i4++) {
      ok = nk = keys[i4];
      for (j = 0; j < tkeys.length; j++) {
        k2 = tkeys[j];
        nk = nk.replace(k2, map$1[k2]);
      }
      k2 = parseInt(names[ok], 16);
      unpacked[nk] = [k2 >> 16 & 255, k2 >> 8 & 255, k2 & 255];
    }
    return unpacked;
  }
  var names$1;
  function nameParse(str) {
    if (!names$1) {
      names$1 = unpack();
      names$1.transparent = [0, 0, 0, 0];
    }
    const a3 = names$1[str.toLowerCase()];
    return a3 && {
      r: a3[0],
      g: a3[1],
      b: a3[2],
      a: a3.length === 4 ? a3[3] : 255
    };
  }
  function modHSL(v2, i4, ratio) {
    if (v2) {
      let tmp = rgb2hsl(v2);
      tmp[i4] = Math.max(0, Math.min(tmp[i4] + tmp[i4] * ratio, i4 === 0 ? 360 : 1));
      tmp = hsl2rgb(tmp);
      v2.r = tmp[0];
      v2.g = tmp[1];
      v2.b = tmp[2];
    }
  }
  function clone(v2, proto) {
    return v2 ? Object.assign(proto || {}, v2) : v2;
  }
  function fromObject(input) {
    var v2 = { r: 0, g: 0, b: 0, a: 255 };
    if (Array.isArray(input)) {
      if (input.length >= 3) {
        v2 = { r: input[0], g: input[1], b: input[2], a: 255 };
        if (input.length > 3) {
          v2.a = n2b(input[3]);
        }
      }
    } else {
      v2 = clone(input, { r: 0, g: 0, b: 0, a: 1 });
      v2.a = n2b(v2.a);
    }
    return v2;
  }
  function functionParse(str) {
    if (str.charAt(0) === "r") {
      return rgbParse(str);
    }
    return hueParse(str);
  }
  var Color = class {
    constructor(input) {
      if (input instanceof Color) {
        return input;
      }
      const type = typeof input;
      let v2;
      if (type === "object") {
        v2 = fromObject(input);
      } else if (type === "string") {
        v2 = hexParse(input) || nameParse(input) || functionParse(input);
      }
      this._rgb = v2;
      this._valid = !!v2;
    }
    get valid() {
      return this._valid;
    }
    get rgb() {
      var v2 = clone(this._rgb);
      if (v2) {
        v2.a = b2n(v2.a);
      }
      return v2;
    }
    set rgb(obj) {
      this._rgb = fromObject(obj);
    }
    rgbString() {
      return this._valid ? rgbString(this._rgb) : this._rgb;
    }
    hexString() {
      return this._valid ? hexString(this._rgb) : this._rgb;
    }
    hslString() {
      return this._valid ? hslString(this._rgb) : this._rgb;
    }
    mix(color2, weight) {
      const me = this;
      if (color2) {
        const c1 = me.rgb;
        const c22 = color2.rgb;
        let w2;
        const p2 = weight === w2 ? 0.5 : weight;
        const w3 = 2 * p2 - 1;
        const a3 = c1.a - c22.a;
        const w1 = ((w3 * a3 === -1 ? w3 : (w3 + a3) / (1 + w3 * a3)) + 1) / 2;
        w2 = 1 - w1;
        c1.r = 255 & w1 * c1.r + w2 * c22.r + 0.5;
        c1.g = 255 & w1 * c1.g + w2 * c22.g + 0.5;
        c1.b = 255 & w1 * c1.b + w2 * c22.b + 0.5;
        c1.a = p2 * c1.a + (1 - p2) * c22.a;
        me.rgb = c1;
      }
      return me;
    }
    clone() {
      return new Color(this.rgb);
    }
    alpha(a3) {
      this._rgb.a = n2b(a3);
      return this;
    }
    clearer(ratio) {
      const rgb = this._rgb;
      rgb.a *= 1 - ratio;
      return this;
    }
    greyscale() {
      const rgb = this._rgb;
      const val = round(rgb.r * 0.3 + rgb.g * 0.59 + rgb.b * 0.11);
      rgb.r = rgb.g = rgb.b = val;
      return this;
    }
    opaquer(ratio) {
      const rgb = this._rgb;
      rgb.a *= 1 + ratio;
      return this;
    }
    negate() {
      const v2 = this._rgb;
      v2.r = 255 - v2.r;
      v2.g = 255 - v2.g;
      v2.b = 255 - v2.b;
      return this;
    }
    lighten(ratio) {
      modHSL(this._rgb, 2, ratio);
      return this;
    }
    darken(ratio) {
      modHSL(this._rgb, 2, -ratio);
      return this;
    }
    saturate(ratio) {
      modHSL(this._rgb, 1, ratio);
      return this;
    }
    desaturate(ratio) {
      modHSL(this._rgb, 1, -ratio);
      return this;
    }
    rotate(deg) {
      rotate(this._rgb, deg);
      return this;
    }
  };
  function index_esm(input) {
    return new Color(input);
  }
  var isPatternOrGradient = (value) => value instanceof CanvasGradient || value instanceof CanvasPattern;
  function color(value) {
    return isPatternOrGradient(value) ? value : index_esm(value);
  }
  function getHoverColor(value) {
    return isPatternOrGradient(value) ? value : index_esm(value).saturate(0.5).darken(0.1).hexString();
  }
  var overrides = /* @__PURE__ */ Object.create(null);
  var descriptors = /* @__PURE__ */ Object.create(null);
  function getScope$1(node, key) {
    if (!key) {
      return node;
    }
    const keys = key.split(".");
    for (let i4 = 0, n3 = keys.length; i4 < n3; ++i4) {
      const k2 = keys[i4];
      node = node[k2] || (node[k2] = /* @__PURE__ */ Object.create(null));
    }
    return node;
  }
  function set(root, scope, values) {
    if (typeof scope === "string") {
      return merge(getScope$1(root, scope), values);
    }
    return merge(getScope$1(root, ""), scope);
  }
  var Defaults = class {
    constructor(_descriptors2) {
      this.animation = void 0;
      this.backgroundColor = "rgba(0,0,0,0.1)";
      this.borderColor = "rgba(0,0,0,0.1)";
      this.color = "#666";
      this.datasets = {};
      this.devicePixelRatio = (context) => context.chart.platform.getDevicePixelRatio();
      this.elements = {};
      this.events = [
        "mousemove",
        "mouseout",
        "click",
        "touchstart",
        "touchmove"
      ];
      this.font = {
        family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
        size: 12,
        style: "normal",
        lineHeight: 1.2,
        weight: null
      };
      this.hover = {};
      this.hoverBackgroundColor = (ctx, options) => getHoverColor(options.backgroundColor);
      this.hoverBorderColor = (ctx, options) => getHoverColor(options.borderColor);
      this.hoverColor = (ctx, options) => getHoverColor(options.color);
      this.indexAxis = "x";
      this.interaction = {
        mode: "nearest",
        intersect: true
      };
      this.maintainAspectRatio = true;
      this.onHover = null;
      this.onClick = null;
      this.parsing = true;
      this.plugins = {};
      this.responsive = true;
      this.scale = void 0;
      this.scales = {};
      this.showLine = true;
      this.drawActiveElementsOnTop = true;
      this.describe(_descriptors2);
    }
    set(scope, values) {
      return set(this, scope, values);
    }
    get(scope) {
      return getScope$1(this, scope);
    }
    describe(scope, values) {
      return set(descriptors, scope, values);
    }
    override(scope, values) {
      return set(overrides, scope, values);
    }
    route(scope, name, targetScope, targetName) {
      const scopeObject = getScope$1(this, scope);
      const targetScopeObject = getScope$1(this, targetScope);
      const privateName = "_" + name;
      Object.defineProperties(scopeObject, {
        [privateName]: {
          value: scopeObject[name],
          writable: true
        },
        [name]: {
          enumerable: true,
          get() {
            const local = this[privateName];
            const target = targetScopeObject[targetName];
            if (isObject(local)) {
              return Object.assign({}, target, local);
            }
            return valueOrDefault(local, target);
          },
          set(value) {
            this[privateName] = value;
          }
        }
      });
    }
  };
  var defaults = new Defaults({
    _scriptable: (name) => !name.startsWith("on"),
    _indexable: (name) => name !== "events",
    hover: {
      _fallback: "interaction"
    },
    interaction: {
      _scriptable: false,
      _indexable: false
    }
  });
  function toFontString(font) {
    if (!font || isNullOrUndef(font.size) || isNullOrUndef(font.family)) {
      return null;
    }
    return (font.style ? font.style + " " : "") + (font.weight ? font.weight + " " : "") + font.size + "px " + font.family;
  }
  function _measureText(ctx, data, gc, longest, string) {
    let textWidth = data[string];
    if (!textWidth) {
      textWidth = data[string] = ctx.measureText(string).width;
      gc.push(string);
    }
    if (textWidth > longest) {
      longest = textWidth;
    }
    return longest;
  }
  function _longestText(ctx, font, arrayOfThings, cache) {
    cache = cache || {};
    let data = cache.data = cache.data || {};
    let gc = cache.garbageCollect = cache.garbageCollect || [];
    if (cache.font !== font) {
      data = cache.data = {};
      gc = cache.garbageCollect = [];
      cache.font = font;
    }
    ctx.save();
    ctx.font = font;
    let longest = 0;
    const ilen = arrayOfThings.length;
    let i4, j, jlen, thing, nestedThing;
    for (i4 = 0; i4 < ilen; i4++) {
      thing = arrayOfThings[i4];
      if (thing !== void 0 && thing !== null && isArray(thing) !== true) {
        longest = _measureText(ctx, data, gc, longest, thing);
      } else if (isArray(thing)) {
        for (j = 0, jlen = thing.length; j < jlen; j++) {
          nestedThing = thing[j];
          if (nestedThing !== void 0 && nestedThing !== null && !isArray(nestedThing)) {
            longest = _measureText(ctx, data, gc, longest, nestedThing);
          }
        }
      }
    }
    ctx.restore();
    const gcLen = gc.length / 2;
    if (gcLen > arrayOfThings.length) {
      for (i4 = 0; i4 < gcLen; i4++) {
        delete data[gc[i4]];
      }
      gc.splice(0, gcLen);
    }
    return longest;
  }
  function _alignPixel(chart2, pixel, width) {
    const devicePixelRatio = chart2.currentDevicePixelRatio;
    const halfWidth = width !== 0 ? Math.max(width / 2, 0.5) : 0;
    return Math.round((pixel - halfWidth) * devicePixelRatio) / devicePixelRatio + halfWidth;
  }
  function clearCanvas(canvas, ctx) {
    ctx = ctx || canvas.getContext("2d");
    ctx.save();
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  function drawPoint(ctx, options, x2, y2) {
    let type, xOffset, yOffset, size, cornerRadius;
    const style = options.pointStyle;
    const rotation = options.rotation;
    const radius = options.radius;
    let rad = (rotation || 0) * RAD_PER_DEG;
    if (style && typeof style === "object") {
      type = style.toString();
      if (type === "[object HTMLImageElement]" || type === "[object HTMLCanvasElement]") {
        ctx.save();
        ctx.translate(x2, y2);
        ctx.rotate(rad);
        ctx.drawImage(style, -style.width / 2, -style.height / 2, style.width, style.height);
        ctx.restore();
        return;
      }
    }
    if (isNaN(radius) || radius <= 0) {
      return;
    }
    ctx.beginPath();
    switch (style) {
      default:
        ctx.arc(x2, y2, radius, 0, TAU);
        ctx.closePath();
        break;
      case "triangle":
        ctx.moveTo(x2 + Math.sin(rad) * radius, y2 - Math.cos(rad) * radius);
        rad += TWO_THIRDS_PI;
        ctx.lineTo(x2 + Math.sin(rad) * radius, y2 - Math.cos(rad) * radius);
        rad += TWO_THIRDS_PI;
        ctx.lineTo(x2 + Math.sin(rad) * radius, y2 - Math.cos(rad) * radius);
        ctx.closePath();
        break;
      case "rectRounded":
        cornerRadius = radius * 0.516;
        size = radius - cornerRadius;
        xOffset = Math.cos(rad + QUARTER_PI) * size;
        yOffset = Math.sin(rad + QUARTER_PI) * size;
        ctx.arc(x2 - xOffset, y2 - yOffset, cornerRadius, rad - PI, rad - HALF_PI);
        ctx.arc(x2 + yOffset, y2 - xOffset, cornerRadius, rad - HALF_PI, rad);
        ctx.arc(x2 + xOffset, y2 + yOffset, cornerRadius, rad, rad + HALF_PI);
        ctx.arc(x2 - yOffset, y2 + xOffset, cornerRadius, rad + HALF_PI, rad + PI);
        ctx.closePath();
        break;
      case "rect":
        if (!rotation) {
          size = Math.SQRT1_2 * radius;
          ctx.rect(x2 - size, y2 - size, 2 * size, 2 * size);
          break;
        }
        rad += QUARTER_PI;
      case "rectRot":
        xOffset = Math.cos(rad) * radius;
        yOffset = Math.sin(rad) * radius;
        ctx.moveTo(x2 - xOffset, y2 - yOffset);
        ctx.lineTo(x2 + yOffset, y2 - xOffset);
        ctx.lineTo(x2 + xOffset, y2 + yOffset);
        ctx.lineTo(x2 - yOffset, y2 + xOffset);
        ctx.closePath();
        break;
      case "crossRot":
        rad += QUARTER_PI;
      case "cross":
        xOffset = Math.cos(rad) * radius;
        yOffset = Math.sin(rad) * radius;
        ctx.moveTo(x2 - xOffset, y2 - yOffset);
        ctx.lineTo(x2 + xOffset, y2 + yOffset);
        ctx.moveTo(x2 + yOffset, y2 - xOffset);
        ctx.lineTo(x2 - yOffset, y2 + xOffset);
        break;
      case "star":
        xOffset = Math.cos(rad) * radius;
        yOffset = Math.sin(rad) * radius;
        ctx.moveTo(x2 - xOffset, y2 - yOffset);
        ctx.lineTo(x2 + xOffset, y2 + yOffset);
        ctx.moveTo(x2 + yOffset, y2 - xOffset);
        ctx.lineTo(x2 - yOffset, y2 + xOffset);
        rad += QUARTER_PI;
        xOffset = Math.cos(rad) * radius;
        yOffset = Math.sin(rad) * radius;
        ctx.moveTo(x2 - xOffset, y2 - yOffset);
        ctx.lineTo(x2 + xOffset, y2 + yOffset);
        ctx.moveTo(x2 + yOffset, y2 - xOffset);
        ctx.lineTo(x2 - yOffset, y2 + xOffset);
        break;
      case "line":
        xOffset = Math.cos(rad) * radius;
        yOffset = Math.sin(rad) * radius;
        ctx.moveTo(x2 - xOffset, y2 - yOffset);
        ctx.lineTo(x2 + xOffset, y2 + yOffset);
        break;
      case "dash":
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 + Math.cos(rad) * radius, y2 + Math.sin(rad) * radius);
        break;
    }
    ctx.fill();
    if (options.borderWidth > 0) {
      ctx.stroke();
    }
  }
  function _isPointInArea(point, area, margin) {
    margin = margin || 0.5;
    return !area || point && point.x > area.left - margin && point.x < area.right + margin && point.y > area.top - margin && point.y < area.bottom + margin;
  }
  function clipArea(ctx, area) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
    ctx.clip();
  }
  function unclipArea(ctx) {
    ctx.restore();
  }
  function _steppedLineTo(ctx, previous, target, flip, mode) {
    if (!previous) {
      return ctx.lineTo(target.x, target.y);
    }
    if (mode === "middle") {
      const midpoint = (previous.x + target.x) / 2;
      ctx.lineTo(midpoint, previous.y);
      ctx.lineTo(midpoint, target.y);
    } else if (mode === "after" !== !!flip) {
      ctx.lineTo(previous.x, target.y);
    } else {
      ctx.lineTo(target.x, previous.y);
    }
    ctx.lineTo(target.x, target.y);
  }
  function _bezierCurveTo(ctx, previous, target, flip) {
    if (!previous) {
      return ctx.lineTo(target.x, target.y);
    }
    ctx.bezierCurveTo(flip ? previous.cp1x : previous.cp2x, flip ? previous.cp1y : previous.cp2y, flip ? target.cp2x : target.cp1x, flip ? target.cp2y : target.cp1y, target.x, target.y);
  }
  function renderText(ctx, text, x2, y2, font, opts = {}) {
    const lines = isArray(text) ? text : [text];
    const stroke = opts.strokeWidth > 0 && opts.strokeColor !== "";
    let i4, line;
    ctx.save();
    ctx.font = font.string;
    setRenderOpts(ctx, opts);
    for (i4 = 0; i4 < lines.length; ++i4) {
      line = lines[i4];
      if (stroke) {
        if (opts.strokeColor) {
          ctx.strokeStyle = opts.strokeColor;
        }
        if (!isNullOrUndef(opts.strokeWidth)) {
          ctx.lineWidth = opts.strokeWidth;
        }
        ctx.strokeText(line, x2, y2, opts.maxWidth);
      }
      ctx.fillText(line, x2, y2, opts.maxWidth);
      decorateText(ctx, x2, y2, line, opts);
      y2 += font.lineHeight;
    }
    ctx.restore();
  }
  function setRenderOpts(ctx, opts) {
    if (opts.translation) {
      ctx.translate(opts.translation[0], opts.translation[1]);
    }
    if (!isNullOrUndef(opts.rotation)) {
      ctx.rotate(opts.rotation);
    }
    if (opts.color) {
      ctx.fillStyle = opts.color;
    }
    if (opts.textAlign) {
      ctx.textAlign = opts.textAlign;
    }
    if (opts.textBaseline) {
      ctx.textBaseline = opts.textBaseline;
    }
  }
  function decorateText(ctx, x2, y2, line, opts) {
    if (opts.strikethrough || opts.underline) {
      const metrics = ctx.measureText(line);
      const left = x2 - metrics.actualBoundingBoxLeft;
      const right = x2 + metrics.actualBoundingBoxRight;
      const top = y2 - metrics.actualBoundingBoxAscent;
      const bottom = y2 + metrics.actualBoundingBoxDescent;
      const yDecoration = opts.strikethrough ? (top + bottom) / 2 : bottom;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
      ctx.lineWidth = opts.decorationWidth || 2;
      ctx.moveTo(left, yDecoration);
      ctx.lineTo(right, yDecoration);
      ctx.stroke();
    }
  }
  function addRoundedRectPath(ctx, rect) {
    const { x: x2, y: y2, w: w2, h: h3, radius } = rect;
    ctx.arc(x2 + radius.topLeft, y2 + radius.topLeft, radius.topLeft, -HALF_PI, PI, true);
    ctx.lineTo(x2, y2 + h3 - radius.bottomLeft);
    ctx.arc(x2 + radius.bottomLeft, y2 + h3 - radius.bottomLeft, radius.bottomLeft, PI, HALF_PI, true);
    ctx.lineTo(x2 + w2 - radius.bottomRight, y2 + h3);
    ctx.arc(x2 + w2 - radius.bottomRight, y2 + h3 - radius.bottomRight, radius.bottomRight, HALF_PI, 0, true);
    ctx.lineTo(x2 + w2, y2 + radius.topRight);
    ctx.arc(x2 + w2 - radius.topRight, y2 + radius.topRight, radius.topRight, 0, -HALF_PI, true);
    ctx.lineTo(x2 + radius.topLeft, y2);
  }
  var LINE_HEIGHT = new RegExp(/^(normal|(\d+(?:\.\d+)?)(px|em|%)?)$/);
  var FONT_STYLE = new RegExp(/^(normal|italic|initial|inherit|unset|(oblique( -?[0-9]?[0-9]deg)?))$/);
  function toLineHeight(value, size) {
    const matches = ("" + value).match(LINE_HEIGHT);
    if (!matches || matches[1] === "normal") {
      return size * 1.2;
    }
    value = +matches[2];
    switch (matches[3]) {
      case "px":
        return value;
      case "%":
        value /= 100;
        break;
    }
    return size * value;
  }
  var numberOrZero = (v2) => +v2 || 0;
  function _readValueToProps(value, props) {
    const ret = {};
    const objProps = isObject(props);
    const keys = objProps ? Object.keys(props) : props;
    const read = isObject(value) ? objProps ? (prop) => valueOrDefault(value[prop], value[props[prop]]) : (prop) => value[prop] : () => value;
    for (const prop of keys) {
      ret[prop] = numberOrZero(read(prop));
    }
    return ret;
  }
  function toTRBL(value) {
    return _readValueToProps(value, { top: "y", right: "x", bottom: "y", left: "x" });
  }
  function toTRBLCorners(value) {
    return _readValueToProps(value, ["topLeft", "topRight", "bottomLeft", "bottomRight"]);
  }
  function toPadding(value) {
    const obj = toTRBL(value);
    obj.width = obj.left + obj.right;
    obj.height = obj.top + obj.bottom;
    return obj;
  }
  function toFont(options, fallback) {
    options = options || {};
    fallback = fallback || defaults.font;
    let size = valueOrDefault(options.size, fallback.size);
    if (typeof size === "string") {
      size = parseInt(size, 10);
    }
    let style = valueOrDefault(options.style, fallback.style);
    if (style && !("" + style).match(FONT_STYLE)) {
      console.warn('Invalid font style specified: "' + style + '"');
      style = "";
    }
    const font = {
      family: valueOrDefault(options.family, fallback.family),
      lineHeight: toLineHeight(valueOrDefault(options.lineHeight, fallback.lineHeight), size),
      size,
      style,
      weight: valueOrDefault(options.weight, fallback.weight),
      string: ""
    };
    font.string = toFontString(font);
    return font;
  }
  function resolve(inputs, context, index, info) {
    let cacheable = true;
    let i4, ilen, value;
    for (i4 = 0, ilen = inputs.length; i4 < ilen; ++i4) {
      value = inputs[i4];
      if (value === void 0) {
        continue;
      }
      if (context !== void 0 && typeof value === "function") {
        value = value(context);
        cacheable = false;
      }
      if (index !== void 0 && isArray(value)) {
        value = value[index % value.length];
        cacheable = false;
      }
      if (value !== void 0) {
        if (info && !cacheable) {
          info.cacheable = false;
        }
        return value;
      }
    }
  }
  function _addGrace(minmax, grace, beginAtZero) {
    const { min, max } = minmax;
    const change = toDimension(grace, (max - min) / 2);
    const keepZero = (value, add) => beginAtZero && value === 0 ? 0 : value + add;
    return {
      min: keepZero(min, -Math.abs(change)),
      max: keepZero(max, change)
    };
  }
  function createContext(parentContext, context) {
    return Object.assign(Object.create(parentContext), context);
  }
  function _lookup(table, value, cmp) {
    cmp = cmp || ((index) => table[index] < value);
    let hi = table.length - 1;
    let lo = 0;
    let mid;
    while (hi - lo > 1) {
      mid = lo + hi >> 1;
      if (cmp(mid)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return { lo, hi };
  }
  var _lookupByKey = (table, key, value) => _lookup(table, value, (index) => table[index][key] < value);
  var _rlookupByKey = (table, key, value) => _lookup(table, value, (index) => table[index][key] >= value);
  function _filterBetween(values, min, max) {
    let start = 0;
    let end = values.length;
    while (start < end && values[start] < min) {
      start++;
    }
    while (end > start && values[end - 1] > max) {
      end--;
    }
    return start > 0 || end < values.length ? values.slice(start, end) : values;
  }
  var arrayEvents = ["push", "pop", "shift", "splice", "unshift"];
  function listenArrayEvents(array, listener) {
    if (array._chartjs) {
      array._chartjs.listeners.push(listener);
      return;
    }
    Object.defineProperty(array, "_chartjs", {
      configurable: true,
      enumerable: false,
      value: {
        listeners: [listener]
      }
    });
    arrayEvents.forEach((key) => {
      const method = "_onData" + _capitalize(key);
      const base = array[key];
      Object.defineProperty(array, key, {
        configurable: true,
        enumerable: false,
        value(...args) {
          const res = base.apply(this, args);
          array._chartjs.listeners.forEach((object) => {
            if (typeof object[method] === "function") {
              object[method](...args);
            }
          });
          return res;
        }
      });
    });
  }
  function unlistenArrayEvents(array, listener) {
    const stub = array._chartjs;
    if (!stub) {
      return;
    }
    const listeners = stub.listeners;
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    if (listeners.length > 0) {
      return;
    }
    arrayEvents.forEach((key) => {
      delete array[key];
    });
    delete array._chartjs;
  }
  function _arrayUnique(items) {
    const set2 = /* @__PURE__ */ new Set();
    let i4, ilen;
    for (i4 = 0, ilen = items.length; i4 < ilen; ++i4) {
      set2.add(items[i4]);
    }
    if (set2.size === ilen) {
      return items;
    }
    return Array.from(set2);
  }
  function _createResolver(scopes, prefixes = [""], rootScopes = scopes, fallback, getTarget = () => scopes[0]) {
    if (!defined(fallback)) {
      fallback = _resolve("_fallback", scopes);
    }
    const cache = {
      [Symbol.toStringTag]: "Object",
      _cacheable: true,
      _scopes: scopes,
      _rootScopes: rootScopes,
      _fallback: fallback,
      _getTarget: getTarget,
      override: (scope) => _createResolver([scope, ...scopes], prefixes, rootScopes, fallback)
    };
    return new Proxy(cache, {
      deleteProperty(target, prop) {
        delete target[prop];
        delete target._keys;
        delete scopes[0][prop];
        return true;
      },
      get(target, prop) {
        return _cached(target, prop, () => _resolveWithPrefixes(prop, prefixes, scopes, target));
      },
      getOwnPropertyDescriptor(target, prop) {
        return Reflect.getOwnPropertyDescriptor(target._scopes[0], prop);
      },
      getPrototypeOf() {
        return Reflect.getPrototypeOf(scopes[0]);
      },
      has(target, prop) {
        return getKeysFromAllScopes(target).includes(prop);
      },
      ownKeys(target) {
        return getKeysFromAllScopes(target);
      },
      set(target, prop, value) {
        const storage = target._storage || (target._storage = getTarget());
        target[prop] = storage[prop] = value;
        delete target._keys;
        return true;
      }
    });
  }
  function _attachContext(proxy, context, subProxy, descriptorDefaults) {
    const cache = {
      _cacheable: false,
      _proxy: proxy,
      _context: context,
      _subProxy: subProxy,
      _stack: /* @__PURE__ */ new Set(),
      _descriptors: _descriptors(proxy, descriptorDefaults),
      setContext: (ctx) => _attachContext(proxy, ctx, subProxy, descriptorDefaults),
      override: (scope) => _attachContext(proxy.override(scope), context, subProxy, descriptorDefaults)
    };
    return new Proxy(cache, {
      deleteProperty(target, prop) {
        delete target[prop];
        delete proxy[prop];
        return true;
      },
      get(target, prop, receiver) {
        return _cached(target, prop, () => _resolveWithContext(target, prop, receiver));
      },
      getOwnPropertyDescriptor(target, prop) {
        return target._descriptors.allKeys ? Reflect.has(proxy, prop) ? { enumerable: true, configurable: true } : void 0 : Reflect.getOwnPropertyDescriptor(proxy, prop);
      },
      getPrototypeOf() {
        return Reflect.getPrototypeOf(proxy);
      },
      has(target, prop) {
        return Reflect.has(proxy, prop);
      },
      ownKeys() {
        return Reflect.ownKeys(proxy);
      },
      set(target, prop, value) {
        proxy[prop] = value;
        delete target[prop];
        return true;
      }
    });
  }
  function _descriptors(proxy, defaults2 = { scriptable: true, indexable: true }) {
    const { _scriptable = defaults2.scriptable, _indexable = defaults2.indexable, _allKeys = defaults2.allKeys } = proxy;
    return {
      allKeys: _allKeys,
      scriptable: _scriptable,
      indexable: _indexable,
      isScriptable: isFunction(_scriptable) ? _scriptable : () => _scriptable,
      isIndexable: isFunction(_indexable) ? _indexable : () => _indexable
    };
  }
  var readKey = (prefix, name) => prefix ? prefix + _capitalize(name) : name;
  var needsSubResolver = (prop, value) => isObject(value) && prop !== "adapters" && (Object.getPrototypeOf(value) === null || value.constructor === Object);
  function _cached(target, prop, resolve2) {
    if (Object.prototype.hasOwnProperty.call(target, prop)) {
      return target[prop];
    }
    const value = resolve2();
    target[prop] = value;
    return value;
  }
  function _resolveWithContext(target, prop, receiver) {
    const { _proxy, _context, _subProxy, _descriptors: descriptors2 } = target;
    let value = _proxy[prop];
    if (isFunction(value) && descriptors2.isScriptable(prop)) {
      value = _resolveScriptable(prop, value, target, receiver);
    }
    if (isArray(value) && value.length) {
      value = _resolveArray(prop, value, target, descriptors2.isIndexable);
    }
    if (needsSubResolver(prop, value)) {
      value = _attachContext(value, _context, _subProxy && _subProxy[prop], descriptors2);
    }
    return value;
  }
  function _resolveScriptable(prop, value, target, receiver) {
    const { _proxy, _context, _subProxy, _stack } = target;
    if (_stack.has(prop)) {
      throw new Error("Recursion detected: " + Array.from(_stack).join("->") + "->" + prop);
    }
    _stack.add(prop);
    value = value(_context, _subProxy || receiver);
    _stack.delete(prop);
    if (needsSubResolver(prop, value)) {
      value = createSubResolver(_proxy._scopes, _proxy, prop, value);
    }
    return value;
  }
  function _resolveArray(prop, value, target, isIndexable) {
    const { _proxy, _context, _subProxy, _descriptors: descriptors2 } = target;
    if (defined(_context.index) && isIndexable(prop)) {
      value = value[_context.index % value.length];
    } else if (isObject(value[0])) {
      const arr = value;
      const scopes = _proxy._scopes.filter((s4) => s4 !== arr);
      value = [];
      for (const item of arr) {
        const resolver = createSubResolver(scopes, _proxy, prop, item);
        value.push(_attachContext(resolver, _context, _subProxy && _subProxy[prop], descriptors2));
      }
    }
    return value;
  }
  function resolveFallback(fallback, prop, value) {
    return isFunction(fallback) ? fallback(prop, value) : fallback;
  }
  var getScope = (key, parent) => key === true ? parent : typeof key === "string" ? resolveObjectKey(parent, key) : void 0;
  function addScopes(set2, parentScopes, key, parentFallback, value) {
    for (const parent of parentScopes) {
      const scope = getScope(key, parent);
      if (scope) {
        set2.add(scope);
        const fallback = resolveFallback(scope._fallback, key, value);
        if (defined(fallback) && fallback !== key && fallback !== parentFallback) {
          return fallback;
        }
      } else if (scope === false && defined(parentFallback) && key !== parentFallback) {
        return null;
      }
    }
    return false;
  }
  function createSubResolver(parentScopes, resolver, prop, value) {
    const rootScopes = resolver._rootScopes;
    const fallback = resolveFallback(resolver._fallback, prop, value);
    const allScopes = [...parentScopes, ...rootScopes];
    const set2 = /* @__PURE__ */ new Set();
    set2.add(value);
    let key = addScopesFromKey(set2, allScopes, prop, fallback || prop, value);
    if (key === null) {
      return false;
    }
    if (defined(fallback) && fallback !== prop) {
      key = addScopesFromKey(set2, allScopes, fallback, key, value);
      if (key === null) {
        return false;
      }
    }
    return _createResolver(Array.from(set2), [""], rootScopes, fallback, () => subGetTarget(resolver, prop, value));
  }
  function addScopesFromKey(set2, allScopes, key, fallback, item) {
    while (key) {
      key = addScopes(set2, allScopes, key, fallback, item);
    }
    return key;
  }
  function subGetTarget(resolver, prop, value) {
    const parent = resolver._getTarget();
    if (!(prop in parent)) {
      parent[prop] = {};
    }
    const target = parent[prop];
    if (isArray(target) && isObject(value)) {
      return value;
    }
    return target;
  }
  function _resolveWithPrefixes(prop, prefixes, scopes, proxy) {
    let value;
    for (const prefix of prefixes) {
      value = _resolve(readKey(prefix, prop), scopes);
      if (defined(value)) {
        return needsSubResolver(prop, value) ? createSubResolver(scopes, proxy, prop, value) : value;
      }
    }
  }
  function _resolve(key, scopes) {
    for (const scope of scopes) {
      if (!scope) {
        continue;
      }
      const value = scope[key];
      if (defined(value)) {
        return value;
      }
    }
  }
  function getKeysFromAllScopes(target) {
    let keys = target._keys;
    if (!keys) {
      keys = target._keys = resolveKeysFromAllScopes(target._scopes);
    }
    return keys;
  }
  function resolveKeysFromAllScopes(scopes) {
    const set2 = /* @__PURE__ */ new Set();
    for (const scope of scopes) {
      for (const key of Object.keys(scope).filter((k2) => !k2.startsWith("_"))) {
        set2.add(key);
      }
    }
    return Array.from(set2);
  }
  var EPSILON = Number.EPSILON || 1e-14;
  var getPoint = (points, i4) => i4 < points.length && !points[i4].skip && points[i4];
  var getValueAxis = (indexAxis) => indexAxis === "x" ? "y" : "x";
  function splineCurve(firstPoint, middlePoint, afterPoint, t4) {
    const previous = firstPoint.skip ? middlePoint : firstPoint;
    const current = middlePoint;
    const next = afterPoint.skip ? middlePoint : afterPoint;
    const d01 = distanceBetweenPoints(current, previous);
    const d12 = distanceBetweenPoints(next, current);
    let s01 = d01 / (d01 + d12);
    let s12 = d12 / (d01 + d12);
    s01 = isNaN(s01) ? 0 : s01;
    s12 = isNaN(s12) ? 0 : s12;
    const fa = t4 * s01;
    const fb = t4 * s12;
    return {
      previous: {
        x: current.x - fa * (next.x - previous.x),
        y: current.y - fa * (next.y - previous.y)
      },
      next: {
        x: current.x + fb * (next.x - previous.x),
        y: current.y + fb * (next.y - previous.y)
      }
    };
  }
  function monotoneAdjust(points, deltaK, mK) {
    const pointsLen = points.length;
    let alphaK, betaK, tauK, squaredMagnitude, pointCurrent;
    let pointAfter = getPoint(points, 0);
    for (let i4 = 0; i4 < pointsLen - 1; ++i4) {
      pointCurrent = pointAfter;
      pointAfter = getPoint(points, i4 + 1);
      if (!pointCurrent || !pointAfter) {
        continue;
      }
      if (almostEquals(deltaK[i4], 0, EPSILON)) {
        mK[i4] = mK[i4 + 1] = 0;
        continue;
      }
      alphaK = mK[i4] / deltaK[i4];
      betaK = mK[i4 + 1] / deltaK[i4];
      squaredMagnitude = Math.pow(alphaK, 2) + Math.pow(betaK, 2);
      if (squaredMagnitude <= 9) {
        continue;
      }
      tauK = 3 / Math.sqrt(squaredMagnitude);
      mK[i4] = alphaK * tauK * deltaK[i4];
      mK[i4 + 1] = betaK * tauK * deltaK[i4];
    }
  }
  function monotoneCompute(points, mK, indexAxis = "x") {
    const valueAxis = getValueAxis(indexAxis);
    const pointsLen = points.length;
    let delta, pointBefore, pointCurrent;
    let pointAfter = getPoint(points, 0);
    for (let i4 = 0; i4 < pointsLen; ++i4) {
      pointBefore = pointCurrent;
      pointCurrent = pointAfter;
      pointAfter = getPoint(points, i4 + 1);
      if (!pointCurrent) {
        continue;
      }
      const iPixel = pointCurrent[indexAxis];
      const vPixel = pointCurrent[valueAxis];
      if (pointBefore) {
        delta = (iPixel - pointBefore[indexAxis]) / 3;
        pointCurrent[`cp1${indexAxis}`] = iPixel - delta;
        pointCurrent[`cp1${valueAxis}`] = vPixel - delta * mK[i4];
      }
      if (pointAfter) {
        delta = (pointAfter[indexAxis] - iPixel) / 3;
        pointCurrent[`cp2${indexAxis}`] = iPixel + delta;
        pointCurrent[`cp2${valueAxis}`] = vPixel + delta * mK[i4];
      }
    }
  }
  function splineCurveMonotone(points, indexAxis = "x") {
    const valueAxis = getValueAxis(indexAxis);
    const pointsLen = points.length;
    const deltaK = Array(pointsLen).fill(0);
    const mK = Array(pointsLen);
    let i4, pointBefore, pointCurrent;
    let pointAfter = getPoint(points, 0);
    for (i4 = 0; i4 < pointsLen; ++i4) {
      pointBefore = pointCurrent;
      pointCurrent = pointAfter;
      pointAfter = getPoint(points, i4 + 1);
      if (!pointCurrent) {
        continue;
      }
      if (pointAfter) {
        const slopeDelta = pointAfter[indexAxis] - pointCurrent[indexAxis];
        deltaK[i4] = slopeDelta !== 0 ? (pointAfter[valueAxis] - pointCurrent[valueAxis]) / slopeDelta : 0;
      }
      mK[i4] = !pointBefore ? deltaK[i4] : !pointAfter ? deltaK[i4 - 1] : sign(deltaK[i4 - 1]) !== sign(deltaK[i4]) ? 0 : (deltaK[i4 - 1] + deltaK[i4]) / 2;
    }
    monotoneAdjust(points, deltaK, mK);
    monotoneCompute(points, mK, indexAxis);
  }
  function capControlPoint(pt, min, max) {
    return Math.max(Math.min(pt, max), min);
  }
  function capBezierPoints(points, area) {
    let i4, ilen, point, inArea, inAreaPrev;
    let inAreaNext = _isPointInArea(points[0], area);
    for (i4 = 0, ilen = points.length; i4 < ilen; ++i4) {
      inAreaPrev = inArea;
      inArea = inAreaNext;
      inAreaNext = i4 < ilen - 1 && _isPointInArea(points[i4 + 1], area);
      if (!inArea) {
        continue;
      }
      point = points[i4];
      if (inAreaPrev) {
        point.cp1x = capControlPoint(point.cp1x, area.left, area.right);
        point.cp1y = capControlPoint(point.cp1y, area.top, area.bottom);
      }
      if (inAreaNext) {
        point.cp2x = capControlPoint(point.cp2x, area.left, area.right);
        point.cp2y = capControlPoint(point.cp2y, area.top, area.bottom);
      }
    }
  }
  function _updateBezierControlPoints(points, options, area, loop, indexAxis) {
    let i4, ilen, point, controlPoints;
    if (options.spanGaps) {
      points = points.filter((pt) => !pt.skip);
    }
    if (options.cubicInterpolationMode === "monotone") {
      splineCurveMonotone(points, indexAxis);
    } else {
      let prev = loop ? points[points.length - 1] : points[0];
      for (i4 = 0, ilen = points.length; i4 < ilen; ++i4) {
        point = points[i4];
        controlPoints = splineCurve(prev, point, points[Math.min(i4 + 1, ilen - (loop ? 0 : 1)) % ilen], options.tension);
        point.cp1x = controlPoints.previous.x;
        point.cp1y = controlPoints.previous.y;
        point.cp2x = controlPoints.next.x;
        point.cp2y = controlPoints.next.y;
        prev = point;
      }
    }
    if (options.capBezierPoints) {
      capBezierPoints(points, area);
    }
  }
  function _isDomSupported() {
    return typeof window !== "undefined" && typeof document !== "undefined";
  }
  function _getParentNode(domNode) {
    let parent = domNode.parentNode;
    if (parent && parent.toString() === "[object ShadowRoot]") {
      parent = parent.host;
    }
    return parent;
  }
  function parseMaxStyle(styleValue, node, parentProperty) {
    let valueInPixels;
    if (typeof styleValue === "string") {
      valueInPixels = parseInt(styleValue, 10);
      if (styleValue.indexOf("%") !== -1) {
        valueInPixels = valueInPixels / 100 * node.parentNode[parentProperty];
      }
    } else {
      valueInPixels = styleValue;
    }
    return valueInPixels;
  }
  var getComputedStyle = (element) => window.getComputedStyle(element, null);
  function getStyle(el, property) {
    return getComputedStyle(el).getPropertyValue(property);
  }
  var positions = ["top", "right", "bottom", "left"];
  function getPositionedStyle(styles, style, suffix) {
    const result = {};
    suffix = suffix ? "-" + suffix : "";
    for (let i4 = 0; i4 < 4; i4++) {
      const pos = positions[i4];
      result[pos] = parseFloat(styles[style + "-" + pos + suffix]) || 0;
    }
    result.width = result.left + result.right;
    result.height = result.top + result.bottom;
    return result;
  }
  var useOffsetPos = (x2, y2, target) => (x2 > 0 || y2 > 0) && (!target || !target.shadowRoot);
  function getCanvasPosition(evt, canvas) {
    const e5 = evt.native || evt;
    const touches = e5.touches;
    const source = touches && touches.length ? touches[0] : e5;
    const { offsetX, offsetY } = source;
    let box = false;
    let x2, y2;
    if (useOffsetPos(offsetX, offsetY, e5.target)) {
      x2 = offsetX;
      y2 = offsetY;
    } else {
      const rect = canvas.getBoundingClientRect();
      x2 = source.clientX - rect.left;
      y2 = source.clientY - rect.top;
      box = true;
    }
    return { x: x2, y: y2, box };
  }
  function getRelativePosition(evt, chart2) {
    const { canvas, currentDevicePixelRatio } = chart2;
    const style = getComputedStyle(canvas);
    const borderBox = style.boxSizing === "border-box";
    const paddings = getPositionedStyle(style, "padding");
    const borders = getPositionedStyle(style, "border", "width");
    const { x: x2, y: y2, box } = getCanvasPosition(evt, canvas);
    const xOffset = paddings.left + (box && borders.left);
    const yOffset = paddings.top + (box && borders.top);
    let { width, height } = chart2;
    if (borderBox) {
      width -= paddings.width + borders.width;
      height -= paddings.height + borders.height;
    }
    return {
      x: Math.round((x2 - xOffset) / width * canvas.width / currentDevicePixelRatio),
      y: Math.round((y2 - yOffset) / height * canvas.height / currentDevicePixelRatio)
    };
  }
  function getContainerSize(canvas, width, height) {
    let maxWidth, maxHeight;
    if (width === void 0 || height === void 0) {
      const container = _getParentNode(canvas);
      if (!container) {
        width = canvas.clientWidth;
        height = canvas.clientHeight;
      } else {
        const rect = container.getBoundingClientRect();
        const containerStyle = getComputedStyle(container);
        const containerBorder = getPositionedStyle(containerStyle, "border", "width");
        const containerPadding = getPositionedStyle(containerStyle, "padding");
        width = rect.width - containerPadding.width - containerBorder.width;
        height = rect.height - containerPadding.height - containerBorder.height;
        maxWidth = parseMaxStyle(containerStyle.maxWidth, container, "clientWidth");
        maxHeight = parseMaxStyle(containerStyle.maxHeight, container, "clientHeight");
      }
    }
    return {
      width,
      height,
      maxWidth: maxWidth || INFINITY,
      maxHeight: maxHeight || INFINITY
    };
  }
  var round1 = (v2) => Math.round(v2 * 10) / 10;
  function getMaximumSize(canvas, bbWidth, bbHeight, aspectRatio) {
    const style = getComputedStyle(canvas);
    const margins = getPositionedStyle(style, "margin");
    const maxWidth = parseMaxStyle(style.maxWidth, canvas, "clientWidth") || INFINITY;
    const maxHeight = parseMaxStyle(style.maxHeight, canvas, "clientHeight") || INFINITY;
    const containerSize = getContainerSize(canvas, bbWidth, bbHeight);
    let { width, height } = containerSize;
    if (style.boxSizing === "content-box") {
      const borders = getPositionedStyle(style, "border", "width");
      const paddings = getPositionedStyle(style, "padding");
      width -= paddings.width + borders.width;
      height -= paddings.height + borders.height;
    }
    width = Math.max(0, width - margins.width);
    height = Math.max(0, aspectRatio ? Math.floor(width / aspectRatio) : height - margins.height);
    width = round1(Math.min(width, maxWidth, containerSize.maxWidth));
    height = round1(Math.min(height, maxHeight, containerSize.maxHeight));
    if (width && !height) {
      height = round1(width / 2);
    }
    return {
      width,
      height
    };
  }
  function retinaScale(chart2, forceRatio, forceStyle) {
    const pixelRatio = forceRatio || 1;
    const deviceHeight = Math.floor(chart2.height * pixelRatio);
    const deviceWidth = Math.floor(chart2.width * pixelRatio);
    chart2.height = deviceHeight / pixelRatio;
    chart2.width = deviceWidth / pixelRatio;
    const canvas = chart2.canvas;
    if (canvas.style && (forceStyle || !canvas.style.height && !canvas.style.width)) {
      canvas.style.height = `${chart2.height}px`;
      canvas.style.width = `${chart2.width}px`;
    }
    if (chart2.currentDevicePixelRatio !== pixelRatio || canvas.height !== deviceHeight || canvas.width !== deviceWidth) {
      chart2.currentDevicePixelRatio = pixelRatio;
      canvas.height = deviceHeight;
      canvas.width = deviceWidth;
      chart2.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      return true;
    }
    return false;
  }
  var supportsEventListenerOptions = function() {
    let passiveSupported = false;
    try {
      const options = {
        get passive() {
          passiveSupported = true;
          return false;
        }
      };
      window.addEventListener("test", null, options);
      window.removeEventListener("test", null, options);
    } catch (e5) {
    }
    return passiveSupported;
  }();
  function readUsedSize(element, property) {
    const value = getStyle(element, property);
    const matches = value && value.match(/^(\d+)(\.\d+)?px$/);
    return matches ? +matches[1] : void 0;
  }
  function _pointInLine(p1, p2, t4, mode) {
    return {
      x: p1.x + t4 * (p2.x - p1.x),
      y: p1.y + t4 * (p2.y - p1.y)
    };
  }
  function _steppedInterpolation(p1, p2, t4, mode) {
    return {
      x: p1.x + t4 * (p2.x - p1.x),
      y: mode === "middle" ? t4 < 0.5 ? p1.y : p2.y : mode === "after" ? t4 < 1 ? p1.y : p2.y : t4 > 0 ? p2.y : p1.y
    };
  }
  function _bezierInterpolation(p1, p2, t4, mode) {
    const cp1 = { x: p1.cp2x, y: p1.cp2y };
    const cp2 = { x: p2.cp1x, y: p2.cp1y };
    const a3 = _pointInLine(p1, cp1, t4);
    const b2 = _pointInLine(cp1, cp2, t4);
    const c4 = _pointInLine(cp2, p2, t4);
    const d2 = _pointInLine(a3, b2, t4);
    const e5 = _pointInLine(b2, c4, t4);
    return _pointInLine(d2, e5, t4);
  }
  var intlCache = /* @__PURE__ */ new Map();
  function getNumberFormat(locale3, options) {
    options = options || {};
    const cacheKey = locale3 + JSON.stringify(options);
    let formatter = intlCache.get(cacheKey);
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale3, options);
      intlCache.set(cacheKey, formatter);
    }
    return formatter;
  }
  function formatNumber(num, locale3, options) {
    return getNumberFormat(locale3, options).format(num);
  }
  var getRightToLeftAdapter = function(rectX, width) {
    return {
      x(x2) {
        return rectX + rectX + width - x2;
      },
      setWidth(w2) {
        width = w2;
      },
      textAlign(align) {
        if (align === "center") {
          return align;
        }
        return align === "right" ? "left" : "right";
      },
      xPlus(x2, value) {
        return x2 - value;
      },
      leftForLtr(x2, itemWidth) {
        return x2 - itemWidth;
      }
    };
  };
  var getLeftToRightAdapter = function() {
    return {
      x(x2) {
        return x2;
      },
      setWidth(w2) {
      },
      textAlign(align) {
        return align;
      },
      xPlus(x2, value) {
        return x2 + value;
      },
      leftForLtr(x2, _itemWidth) {
        return x2;
      }
    };
  };
  function getRtlAdapter(rtl, rectX, width) {
    return rtl ? getRightToLeftAdapter(rectX, width) : getLeftToRightAdapter();
  }
  function overrideTextDirection(ctx, direction) {
    let style, original;
    if (direction === "ltr" || direction === "rtl") {
      style = ctx.canvas.style;
      original = [
        style.getPropertyValue("direction"),
        style.getPropertyPriority("direction")
      ];
      style.setProperty("direction", direction, "important");
      ctx.prevTextDirection = original;
    }
  }
  function restoreTextDirection(ctx, original) {
    if (original !== void 0) {
      delete ctx.prevTextDirection;
      ctx.canvas.style.setProperty("direction", original[0], original[1]);
    }
  }
  function propertyFn(property) {
    if (property === "angle") {
      return {
        between: _angleBetween,
        compare: _angleDiff,
        normalize: _normalizeAngle
      };
    }
    return {
      between: _isBetween,
      compare: (a3, b2) => a3 - b2,
      normalize: (x2) => x2
    };
  }
  function normalizeSegment({ start, end, count, loop, style }) {
    return {
      start: start % count,
      end: end % count,
      loop: loop && (end - start + 1) % count === 0,
      style
    };
  }
  function getSegment(segment, points, bounds) {
    const { property, start: startBound, end: endBound } = bounds;
    const { between, normalize } = propertyFn(property);
    const count = points.length;
    let { start, end, loop } = segment;
    let i4, ilen;
    if (loop) {
      start += count;
      end += count;
      for (i4 = 0, ilen = count; i4 < ilen; ++i4) {
        if (!between(normalize(points[start % count][property]), startBound, endBound)) {
          break;
        }
        start--;
        end--;
      }
      start %= count;
      end %= count;
    }
    if (end < start) {
      end += count;
    }
    return { start, end, loop, style: segment.style };
  }
  function _boundSegment(segment, points, bounds) {
    if (!bounds) {
      return [segment];
    }
    const { property, start: startBound, end: endBound } = bounds;
    const count = points.length;
    const { compare, between, normalize } = propertyFn(property);
    const { start, end, loop, style } = getSegment(segment, points, bounds);
    const result = [];
    let inside = false;
    let subStart = null;
    let value, point, prevValue;
    const startIsBefore = () => between(startBound, prevValue, value) && compare(startBound, prevValue) !== 0;
    const endIsBefore = () => compare(endBound, value) === 0 || between(endBound, prevValue, value);
    const shouldStart = () => inside || startIsBefore();
    const shouldStop = () => !inside || endIsBefore();
    for (let i4 = start, prev = start; i4 <= end; ++i4) {
      point = points[i4 % count];
      if (point.skip) {
        continue;
      }
      value = normalize(point[property]);
      if (value === prevValue) {
        continue;
      }
      inside = between(value, startBound, endBound);
      if (subStart === null && shouldStart()) {
        subStart = compare(value, startBound) === 0 ? i4 : prev;
      }
      if (subStart !== null && shouldStop()) {
        result.push(normalizeSegment({ start: subStart, end: i4, loop, count, style }));
        subStart = null;
      }
      prev = i4;
      prevValue = value;
    }
    if (subStart !== null) {
      result.push(normalizeSegment({ start: subStart, end, loop, count, style }));
    }
    return result;
  }
  function _boundSegments(line, bounds) {
    const result = [];
    const segments = line.segments;
    for (let i4 = 0; i4 < segments.length; i4++) {
      const sub = _boundSegment(segments[i4], line.points, bounds);
      if (sub.length) {
        result.push(...sub);
      }
    }
    return result;
  }
  function findStartAndEnd(points, count, loop, spanGaps) {
    let start = 0;
    let end = count - 1;
    if (loop && !spanGaps) {
      while (start < count && !points[start].skip) {
        start++;
      }
    }
    while (start < count && points[start].skip) {
      start++;
    }
    start %= count;
    if (loop) {
      end += start;
    }
    while (end > start && points[end % count].skip) {
      end--;
    }
    end %= count;
    return { start, end };
  }
  function solidSegments(points, start, max, loop) {
    const count = points.length;
    const result = [];
    let last = start;
    let prev = points[start];
    let end;
    for (end = start + 1; end <= max; ++end) {
      const cur = points[end % count];
      if (cur.skip || cur.stop) {
        if (!prev.skip) {
          loop = false;
          result.push({ start: start % count, end: (end - 1) % count, loop });
          start = last = cur.stop ? end : null;
        }
      } else {
        last = end;
        if (prev.skip) {
          start = end;
        }
      }
      prev = cur;
    }
    if (last !== null) {
      result.push({ start: start % count, end: last % count, loop });
    }
    return result;
  }
  function _computeSegments(line, segmentOptions) {
    const points = line.points;
    const spanGaps = line.options.spanGaps;
    const count = points.length;
    if (!count) {
      return [];
    }
    const loop = !!line._loop;
    const { start, end } = findStartAndEnd(points, count, loop, spanGaps);
    if (spanGaps === true) {
      return splitByStyles(line, [{ start, end, loop }], points, segmentOptions);
    }
    const max = end < start ? end + count : end;
    const completeLoop = !!line._fullLoop && start === 0 && end === count - 1;
    return splitByStyles(line, solidSegments(points, start, max, completeLoop), points, segmentOptions);
  }
  function splitByStyles(line, segments, points, segmentOptions) {
    if (!segmentOptions || !segmentOptions.setContext || !points) {
      return segments;
    }
    return doSplitByStyles(line, segments, points, segmentOptions);
  }
  function doSplitByStyles(line, segments, points, segmentOptions) {
    const chartContext = line._chart.getContext();
    const baseStyle = readStyle(line.options);
    const { _datasetIndex: datasetIndex, options: { spanGaps } } = line;
    const count = points.length;
    const result = [];
    let prevStyle = baseStyle;
    let start = segments[0].start;
    let i4 = start;
    function addStyle(s4, e5, l2, st) {
      const dir = spanGaps ? -1 : 1;
      if (s4 === e5) {
        return;
      }
      s4 += count;
      while (points[s4 % count].skip) {
        s4 -= dir;
      }
      while (points[e5 % count].skip) {
        e5 += dir;
      }
      if (s4 % count !== e5 % count) {
        result.push({ start: s4 % count, end: e5 % count, loop: l2, style: st });
        prevStyle = st;
        start = e5 % count;
      }
    }
    for (const segment of segments) {
      start = spanGaps ? start : segment.start;
      let prev = points[start % count];
      let style;
      for (i4 = start + 1; i4 <= segment.end; i4++) {
        const pt = points[i4 % count];
        style = readStyle(segmentOptions.setContext(createContext(chartContext, {
          type: "segment",
          p0: prev,
          p1: pt,
          p0DataIndex: (i4 - 1) % count,
          p1DataIndex: i4 % count,
          datasetIndex
        })));
        if (styleChanged(style, prevStyle)) {
          addStyle(start, i4 - 1, segment.loop, prevStyle);
        }
        prev = pt;
        prevStyle = style;
      }
      if (start < i4 - 1) {
        addStyle(start, i4 - 1, segment.loop, prevStyle);
      }
    }
    return result;
  }
  function readStyle(options) {
    return {
      backgroundColor: options.backgroundColor,
      borderCapStyle: options.borderCapStyle,
      borderDash: options.borderDash,
      borderDashOffset: options.borderDashOffset,
      borderJoinStyle: options.borderJoinStyle,
      borderWidth: options.borderWidth,
      borderColor: options.borderColor
    };
  }
  function styleChanged(style, prevStyle) {
    return prevStyle && JSON.stringify(style) !== JSON.stringify(prevStyle);
  }

  // node_modules/chart.js/dist/chart.esm.js
  var Animator = class {
    constructor() {
      this._request = null;
      this._charts = /* @__PURE__ */ new Map();
      this._running = false;
      this._lastDate = void 0;
    }
    _notify(chart2, anims, date, type) {
      const callbacks = anims.listeners[type];
      const numSteps = anims.duration;
      callbacks.forEach((fn) => fn({
        chart: chart2,
        initial: anims.initial,
        numSteps,
        currentStep: Math.min(date - anims.start, numSteps)
      }));
    }
    _refresh() {
      if (this._request) {
        return;
      }
      this._running = true;
      this._request = requestAnimFrame.call(window, () => {
        this._update();
        this._request = null;
        if (this._running) {
          this._refresh();
        }
      });
    }
    _update(date = Date.now()) {
      let remaining = 0;
      this._charts.forEach((anims, chart2) => {
        if (!anims.running || !anims.items.length) {
          return;
        }
        const items = anims.items;
        let i4 = items.length - 1;
        let draw2 = false;
        let item;
        for (; i4 >= 0; --i4) {
          item = items[i4];
          if (item._active) {
            if (item._total > anims.duration) {
              anims.duration = item._total;
            }
            item.tick(date);
            draw2 = true;
          } else {
            items[i4] = items[items.length - 1];
            items.pop();
          }
        }
        if (draw2) {
          chart2.draw();
          this._notify(chart2, anims, date, "progress");
        }
        if (!items.length) {
          anims.running = false;
          this._notify(chart2, anims, date, "complete");
          anims.initial = false;
        }
        remaining += items.length;
      });
      this._lastDate = date;
      if (remaining === 0) {
        this._running = false;
      }
    }
    _getAnims(chart2) {
      const charts = this._charts;
      let anims = charts.get(chart2);
      if (!anims) {
        anims = {
          running: false,
          initial: true,
          items: [],
          listeners: {
            complete: [],
            progress: []
          }
        };
        charts.set(chart2, anims);
      }
      return anims;
    }
    listen(chart2, event, cb) {
      this._getAnims(chart2).listeners[event].push(cb);
    }
    add(chart2, items) {
      if (!items || !items.length) {
        return;
      }
      this._getAnims(chart2).items.push(...items);
    }
    has(chart2) {
      return this._getAnims(chart2).items.length > 0;
    }
    start(chart2) {
      const anims = this._charts.get(chart2);
      if (!anims) {
        return;
      }
      anims.running = true;
      anims.start = Date.now();
      anims.duration = anims.items.reduce((acc, cur) => Math.max(acc, cur._duration), 0);
      this._refresh();
    }
    running(chart2) {
      if (!this._running) {
        return false;
      }
      const anims = this._charts.get(chart2);
      if (!anims || !anims.running || !anims.items.length) {
        return false;
      }
      return true;
    }
    stop(chart2) {
      const anims = this._charts.get(chart2);
      if (!anims || !anims.items.length) {
        return;
      }
      const items = anims.items;
      let i4 = items.length - 1;
      for (; i4 >= 0; --i4) {
        items[i4].cancel();
      }
      anims.items = [];
      this._notify(chart2, anims, Date.now(), "complete");
    }
    remove(chart2) {
      return this._charts.delete(chart2);
    }
  };
  var animator = new Animator();
  var transparent = "transparent";
  var interpolators = {
    boolean(from, to, factor) {
      return factor > 0.5 ? to : from;
    },
    color(from, to, factor) {
      const c0 = color(from || transparent);
      const c1 = c0.valid && color(to || transparent);
      return c1 && c1.valid ? c1.mix(c0, factor).hexString() : to;
    },
    number(from, to, factor) {
      return from + (to - from) * factor;
    }
  };
  var Animation = class {
    constructor(cfg, target, prop, to) {
      const currentValue = target[prop];
      to = resolve([cfg.to, to, currentValue, cfg.from]);
      const from = resolve([cfg.from, currentValue, to]);
      this._active = true;
      this._fn = cfg.fn || interpolators[cfg.type || typeof from];
      this._easing = effects[cfg.easing] || effects.linear;
      this._start = Math.floor(Date.now() + (cfg.delay || 0));
      this._duration = this._total = Math.floor(cfg.duration);
      this._loop = !!cfg.loop;
      this._target = target;
      this._prop = prop;
      this._from = from;
      this._to = to;
      this._promises = void 0;
    }
    active() {
      return this._active;
    }
    update(cfg, to, date) {
      if (this._active) {
        this._notify(false);
        const currentValue = this._target[this._prop];
        const elapsed = date - this._start;
        const remain = this._duration - elapsed;
        this._start = date;
        this._duration = Math.floor(Math.max(remain, cfg.duration));
        this._total += elapsed;
        this._loop = !!cfg.loop;
        this._to = resolve([cfg.to, to, currentValue, cfg.from]);
        this._from = resolve([cfg.from, currentValue, to]);
      }
    }
    cancel() {
      if (this._active) {
        this.tick(Date.now());
        this._active = false;
        this._notify(false);
      }
    }
    tick(date) {
      const elapsed = date - this._start;
      const duration = this._duration;
      const prop = this._prop;
      const from = this._from;
      const loop = this._loop;
      const to = this._to;
      let factor;
      this._active = from !== to && (loop || elapsed < duration);
      if (!this._active) {
        this._target[prop] = to;
        this._notify(true);
        return;
      }
      if (elapsed < 0) {
        this._target[prop] = from;
        return;
      }
      factor = elapsed / duration % 2;
      factor = loop && factor > 1 ? 2 - factor : factor;
      factor = this._easing(Math.min(1, Math.max(0, factor)));
      this._target[prop] = this._fn(from, to, factor);
    }
    wait() {
      const promises = this._promises || (this._promises = []);
      return new Promise((res, rej) => {
        promises.push({ res, rej });
      });
    }
    _notify(resolved) {
      const method = resolved ? "res" : "rej";
      const promises = this._promises || [];
      for (let i4 = 0; i4 < promises.length; i4++) {
        promises[i4][method]();
      }
    }
  };
  var numbers = ["x", "y", "borderWidth", "radius", "tension"];
  var colors = ["color", "borderColor", "backgroundColor"];
  defaults.set("animation", {
    delay: void 0,
    duration: 1e3,
    easing: "easeOutQuart",
    fn: void 0,
    from: void 0,
    loop: void 0,
    to: void 0,
    type: void 0
  });
  var animationOptions = Object.keys(defaults.animation);
  defaults.describe("animation", {
    _fallback: false,
    _indexable: false,
    _scriptable: (name) => name !== "onProgress" && name !== "onComplete" && name !== "fn"
  });
  defaults.set("animations", {
    colors: {
      type: "color",
      properties: colors
    },
    numbers: {
      type: "number",
      properties: numbers
    }
  });
  defaults.describe("animations", {
    _fallback: "animation"
  });
  defaults.set("transitions", {
    active: {
      animation: {
        duration: 400
      }
    },
    resize: {
      animation: {
        duration: 0
      }
    },
    show: {
      animations: {
        colors: {
          from: "transparent"
        },
        visible: {
          type: "boolean",
          duration: 0
        }
      }
    },
    hide: {
      animations: {
        colors: {
          to: "transparent"
        },
        visible: {
          type: "boolean",
          easing: "linear",
          fn: (v2) => v2 | 0
        }
      }
    }
  });
  var Animations = class {
    constructor(chart2, config) {
      this._chart = chart2;
      this._properties = /* @__PURE__ */ new Map();
      this.configure(config);
    }
    configure(config) {
      if (!isObject(config)) {
        return;
      }
      const animatedProps = this._properties;
      Object.getOwnPropertyNames(config).forEach((key) => {
        const cfg = config[key];
        if (!isObject(cfg)) {
          return;
        }
        const resolved = {};
        for (const option of animationOptions) {
          resolved[option] = cfg[option];
        }
        (isArray(cfg.properties) && cfg.properties || [key]).forEach((prop) => {
          if (prop === key || !animatedProps.has(prop)) {
            animatedProps.set(prop, resolved);
          }
        });
      });
    }
    _animateOptions(target, values) {
      const newOptions = values.options;
      const options = resolveTargetOptions(target, newOptions);
      if (!options) {
        return [];
      }
      const animations = this._createAnimations(options, newOptions);
      if (newOptions.$shared) {
        awaitAll(target.options.$animations, newOptions).then(() => {
          target.options = newOptions;
        }, () => {
        });
      }
      return animations;
    }
    _createAnimations(target, values) {
      const animatedProps = this._properties;
      const animations = [];
      const running = target.$animations || (target.$animations = {});
      const props = Object.keys(values);
      const date = Date.now();
      let i4;
      for (i4 = props.length - 1; i4 >= 0; --i4) {
        const prop = props[i4];
        if (prop.charAt(0) === "$") {
          continue;
        }
        if (prop === "options") {
          animations.push(...this._animateOptions(target, values));
          continue;
        }
        const value = values[prop];
        let animation = running[prop];
        const cfg = animatedProps.get(prop);
        if (animation) {
          if (cfg && animation.active()) {
            animation.update(cfg, value, date);
            continue;
          } else {
            animation.cancel();
          }
        }
        if (!cfg || !cfg.duration) {
          target[prop] = value;
          continue;
        }
        running[prop] = animation = new Animation(cfg, target, prop, value);
        animations.push(animation);
      }
      return animations;
    }
    update(target, values) {
      if (this._properties.size === 0) {
        Object.assign(target, values);
        return;
      }
      const animations = this._createAnimations(target, values);
      if (animations.length) {
        animator.add(this._chart, animations);
        return true;
      }
    }
  };
  function awaitAll(animations, properties) {
    const running = [];
    const keys = Object.keys(properties);
    for (let i4 = 0; i4 < keys.length; i4++) {
      const anim = animations[keys[i4]];
      if (anim && anim.active()) {
        running.push(anim.wait());
      }
    }
    return Promise.all(running);
  }
  function resolveTargetOptions(target, newOptions) {
    if (!newOptions) {
      return;
    }
    let options = target.options;
    if (!options) {
      target.options = newOptions;
      return;
    }
    if (options.$shared) {
      target.options = options = Object.assign({}, options, { $shared: false, $animations: {} });
    }
    return options;
  }
  function scaleClip(scale, allowedOverflow) {
    const opts = scale && scale.options || {};
    const reverse = opts.reverse;
    const min = opts.min === void 0 ? allowedOverflow : 0;
    const max = opts.max === void 0 ? allowedOverflow : 0;
    return {
      start: reverse ? max : min,
      end: reverse ? min : max
    };
  }
  function defaultClip(xScale, yScale, allowedOverflow) {
    if (allowedOverflow === false) {
      return false;
    }
    const x2 = scaleClip(xScale, allowedOverflow);
    const y2 = scaleClip(yScale, allowedOverflow);
    return {
      top: y2.end,
      right: x2.end,
      bottom: y2.start,
      left: x2.start
    };
  }
  function toClip(value) {
    let t4, r3, b2, l2;
    if (isObject(value)) {
      t4 = value.top;
      r3 = value.right;
      b2 = value.bottom;
      l2 = value.left;
    } else {
      t4 = r3 = b2 = l2 = value;
    }
    return {
      top: t4,
      right: r3,
      bottom: b2,
      left: l2,
      disabled: value === false
    };
  }
  function getSortedDatasetIndices(chart2, filterVisible) {
    const keys = [];
    const metasets = chart2._getSortedDatasetMetas(filterVisible);
    let i4, ilen;
    for (i4 = 0, ilen = metasets.length; i4 < ilen; ++i4) {
      keys.push(metasets[i4].index);
    }
    return keys;
  }
  function applyStack(stack, value, dsIndex, options = {}) {
    const keys = stack.keys;
    const singleMode = options.mode === "single";
    let i4, ilen, datasetIndex, otherValue;
    if (value === null) {
      return;
    }
    for (i4 = 0, ilen = keys.length; i4 < ilen; ++i4) {
      datasetIndex = +keys[i4];
      if (datasetIndex === dsIndex) {
        if (options.all) {
          continue;
        }
        break;
      }
      otherValue = stack.values[datasetIndex];
      if (isNumberFinite(otherValue) && (singleMode || (value === 0 || sign(value) === sign(otherValue)))) {
        value += otherValue;
      }
    }
    return value;
  }
  function convertObjectDataToArray(data) {
    const keys = Object.keys(data);
    const adata = new Array(keys.length);
    let i4, ilen, key;
    for (i4 = 0, ilen = keys.length; i4 < ilen; ++i4) {
      key = keys[i4];
      adata[i4] = {
        x: key,
        y: data[key]
      };
    }
    return adata;
  }
  function isStacked(scale, meta) {
    const stacked = scale && scale.options.stacked;
    return stacked || stacked === void 0 && meta.stack !== void 0;
  }
  function getStackKey(indexScale, valueScale, meta) {
    return `${indexScale.id}.${valueScale.id}.${meta.stack || meta.type}`;
  }
  function getUserBounds(scale) {
    const { min, max, minDefined, maxDefined } = scale.getUserBounds();
    return {
      min: minDefined ? min : Number.NEGATIVE_INFINITY,
      max: maxDefined ? max : Number.POSITIVE_INFINITY
    };
  }
  function getOrCreateStack(stacks, stackKey, indexValue) {
    const subStack = stacks[stackKey] || (stacks[stackKey] = {});
    return subStack[indexValue] || (subStack[indexValue] = {});
  }
  function getLastIndexInStack(stack, vScale, positive, type) {
    for (const meta of vScale.getMatchingVisibleMetas(type).reverse()) {
      const value = stack[meta.index];
      if (positive && value > 0 || !positive && value < 0) {
        return meta.index;
      }
    }
    return null;
  }
  function updateStacks(controller, parsed) {
    const { chart: chart2, _cachedMeta: meta } = controller;
    const stacks = chart2._stacks || (chart2._stacks = {});
    const { iScale, vScale, index: datasetIndex } = meta;
    const iAxis = iScale.axis;
    const vAxis = vScale.axis;
    const key = getStackKey(iScale, vScale, meta);
    const ilen = parsed.length;
    let stack;
    for (let i4 = 0; i4 < ilen; ++i4) {
      const item = parsed[i4];
      const { [iAxis]: index, [vAxis]: value } = item;
      const itemStacks = item._stacks || (item._stacks = {});
      stack = itemStacks[vAxis] = getOrCreateStack(stacks, key, index);
      stack[datasetIndex] = value;
      stack._top = getLastIndexInStack(stack, vScale, true, meta.type);
      stack._bottom = getLastIndexInStack(stack, vScale, false, meta.type);
    }
  }
  function getFirstScaleId(chart2, axis) {
    const scales = chart2.scales;
    return Object.keys(scales).filter((key) => scales[key].axis === axis).shift();
  }
  function createDatasetContext(parent, index) {
    return createContext(parent, {
      active: false,
      dataset: void 0,
      datasetIndex: index,
      index,
      mode: "default",
      type: "dataset"
    });
  }
  function createDataContext(parent, index, element) {
    return createContext(parent, {
      active: false,
      dataIndex: index,
      parsed: void 0,
      raw: void 0,
      element,
      index,
      mode: "default",
      type: "data"
    });
  }
  function clearStacks(meta, items) {
    const datasetIndex = meta.controller.index;
    const axis = meta.vScale && meta.vScale.axis;
    if (!axis) {
      return;
    }
    items = items || meta._parsed;
    for (const parsed of items) {
      const stacks = parsed._stacks;
      if (!stacks || stacks[axis] === void 0 || stacks[axis][datasetIndex] === void 0) {
        return;
      }
      delete stacks[axis][datasetIndex];
    }
  }
  var isDirectUpdateMode = (mode) => mode === "reset" || mode === "none";
  var cloneIfNotShared = (cached, shared) => shared ? cached : Object.assign({}, cached);
  var createStack = (canStack, meta, chart2) => canStack && !meta.hidden && meta._stacked && { keys: getSortedDatasetIndices(chart2, true), values: null };
  var DatasetController = class {
    constructor(chart2, datasetIndex) {
      this.chart = chart2;
      this._ctx = chart2.ctx;
      this.index = datasetIndex;
      this._cachedDataOpts = {};
      this._cachedMeta = this.getMeta();
      this._type = this._cachedMeta.type;
      this.options = void 0;
      this._parsing = false;
      this._data = void 0;
      this._objectData = void 0;
      this._sharedOptions = void 0;
      this._drawStart = void 0;
      this._drawCount = void 0;
      this.enableOptionSharing = false;
      this.$context = void 0;
      this._syncList = [];
      this.initialize();
    }
    initialize() {
      const meta = this._cachedMeta;
      this.configure();
      this.linkScales();
      meta._stacked = isStacked(meta.vScale, meta);
      this.addElements();
    }
    updateIndex(datasetIndex) {
      if (this.index !== datasetIndex) {
        clearStacks(this._cachedMeta);
      }
      this.index = datasetIndex;
    }
    linkScales() {
      const chart2 = this.chart;
      const meta = this._cachedMeta;
      const dataset = this.getDataset();
      const chooseId = (axis, x2, y2, r3) => axis === "x" ? x2 : axis === "r" ? r3 : y2;
      const xid = meta.xAxisID = valueOrDefault(dataset.xAxisID, getFirstScaleId(chart2, "x"));
      const yid = meta.yAxisID = valueOrDefault(dataset.yAxisID, getFirstScaleId(chart2, "y"));
      const rid = meta.rAxisID = valueOrDefault(dataset.rAxisID, getFirstScaleId(chart2, "r"));
      const indexAxis = meta.indexAxis;
      const iid = meta.iAxisID = chooseId(indexAxis, xid, yid, rid);
      const vid = meta.vAxisID = chooseId(indexAxis, yid, xid, rid);
      meta.xScale = this.getScaleForId(xid);
      meta.yScale = this.getScaleForId(yid);
      meta.rScale = this.getScaleForId(rid);
      meta.iScale = this.getScaleForId(iid);
      meta.vScale = this.getScaleForId(vid);
    }
    getDataset() {
      return this.chart.data.datasets[this.index];
    }
    getMeta() {
      return this.chart.getDatasetMeta(this.index);
    }
    getScaleForId(scaleID) {
      return this.chart.scales[scaleID];
    }
    _getOtherScale(scale) {
      const meta = this._cachedMeta;
      return scale === meta.iScale ? meta.vScale : meta.iScale;
    }
    reset() {
      this._update("reset");
    }
    _destroy() {
      const meta = this._cachedMeta;
      if (this._data) {
        unlistenArrayEvents(this._data, this);
      }
      if (meta._stacked) {
        clearStacks(meta);
      }
    }
    _dataCheck() {
      const dataset = this.getDataset();
      const data = dataset.data || (dataset.data = []);
      const _data = this._data;
      if (isObject(data)) {
        this._data = convertObjectDataToArray(data);
      } else if (_data !== data) {
        if (_data) {
          unlistenArrayEvents(_data, this);
          const meta = this._cachedMeta;
          clearStacks(meta);
          meta._parsed = [];
        }
        if (data && Object.isExtensible(data)) {
          listenArrayEvents(data, this);
        }
        this._syncList = [];
        this._data = data;
      }
    }
    addElements() {
      const meta = this._cachedMeta;
      this._dataCheck();
      if (this.datasetElementType) {
        meta.dataset = new this.datasetElementType();
      }
    }
    buildOrUpdateElements(resetNewElements) {
      const meta = this._cachedMeta;
      const dataset = this.getDataset();
      let stackChanged = false;
      this._dataCheck();
      const oldStacked = meta._stacked;
      meta._stacked = isStacked(meta.vScale, meta);
      if (meta.stack !== dataset.stack) {
        stackChanged = true;
        clearStacks(meta);
        meta.stack = dataset.stack;
      }
      this._resyncElements(resetNewElements);
      if (stackChanged || oldStacked !== meta._stacked) {
        updateStacks(this, meta._parsed);
      }
    }
    configure() {
      const config = this.chart.config;
      const scopeKeys = config.datasetScopeKeys(this._type);
      const scopes = config.getOptionScopes(this.getDataset(), scopeKeys, true);
      this.options = config.createResolver(scopes, this.getContext());
      this._parsing = this.options.parsing;
      this._cachedDataOpts = {};
    }
    parse(start, count) {
      const { _cachedMeta: meta, _data: data } = this;
      const { iScale, _stacked } = meta;
      const iAxis = iScale.axis;
      let sorted = start === 0 && count === data.length ? true : meta._sorted;
      let prev = start > 0 && meta._parsed[start - 1];
      let i4, cur, parsed;
      if (this._parsing === false) {
        meta._parsed = data;
        meta._sorted = true;
        parsed = data;
      } else {
        if (isArray(data[start])) {
          parsed = this.parseArrayData(meta, data, start, count);
        } else if (isObject(data[start])) {
          parsed = this.parseObjectData(meta, data, start, count);
        } else {
          parsed = this.parsePrimitiveData(meta, data, start, count);
        }
        const isNotInOrderComparedToPrev = () => cur[iAxis] === null || prev && cur[iAxis] < prev[iAxis];
        for (i4 = 0; i4 < count; ++i4) {
          meta._parsed[i4 + start] = cur = parsed[i4];
          if (sorted) {
            if (isNotInOrderComparedToPrev()) {
              sorted = false;
            }
            prev = cur;
          }
        }
        meta._sorted = sorted;
      }
      if (_stacked) {
        updateStacks(this, parsed);
      }
    }
    parsePrimitiveData(meta, data, start, count) {
      const { iScale, vScale } = meta;
      const iAxis = iScale.axis;
      const vAxis = vScale.axis;
      const labels = iScale.getLabels();
      const singleScale = iScale === vScale;
      const parsed = new Array(count);
      let i4, ilen, index;
      for (i4 = 0, ilen = count; i4 < ilen; ++i4) {
        index = i4 + start;
        parsed[i4] = {
          [iAxis]: singleScale || iScale.parse(labels[index], index),
          [vAxis]: vScale.parse(data[index], index)
        };
      }
      return parsed;
    }
    parseArrayData(meta, data, start, count) {
      const { xScale, yScale } = meta;
      const parsed = new Array(count);
      let i4, ilen, index, item;
      for (i4 = 0, ilen = count; i4 < ilen; ++i4) {
        index = i4 + start;
        item = data[index];
        parsed[i4] = {
          x: xScale.parse(item[0], index),
          y: yScale.parse(item[1], index)
        };
      }
      return parsed;
    }
    parseObjectData(meta, data, start, count) {
      const { xScale, yScale } = meta;
      const { xAxisKey = "x", yAxisKey = "y" } = this._parsing;
      const parsed = new Array(count);
      let i4, ilen, index, item;
      for (i4 = 0, ilen = count; i4 < ilen; ++i4) {
        index = i4 + start;
        item = data[index];
        parsed[i4] = {
          x: xScale.parse(resolveObjectKey(item, xAxisKey), index),
          y: yScale.parse(resolveObjectKey(item, yAxisKey), index)
        };
      }
      return parsed;
    }
    getParsed(index) {
      return this._cachedMeta._parsed[index];
    }
    getDataElement(index) {
      return this._cachedMeta.data[index];
    }
    applyStack(scale, parsed, mode) {
      const chart2 = this.chart;
      const meta = this._cachedMeta;
      const value = parsed[scale.axis];
      const stack = {
        keys: getSortedDatasetIndices(chart2, true),
        values: parsed._stacks[scale.axis]
      };
      return applyStack(stack, value, meta.index, { mode });
    }
    updateRangeFromParsed(range, scale, parsed, stack) {
      const parsedValue = parsed[scale.axis];
      let value = parsedValue === null ? NaN : parsedValue;
      const values = stack && parsed._stacks[scale.axis];
      if (stack && values) {
        stack.values = values;
        value = applyStack(stack, parsedValue, this._cachedMeta.index);
      }
      range.min = Math.min(range.min, value);
      range.max = Math.max(range.max, value);
    }
    getMinMax(scale, canStack) {
      const meta = this._cachedMeta;
      const _parsed = meta._parsed;
      const sorted = meta._sorted && scale === meta.iScale;
      const ilen = _parsed.length;
      const otherScale = this._getOtherScale(scale);
      const stack = createStack(canStack, meta, this.chart);
      const range = { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY };
      const { min: otherMin, max: otherMax } = getUserBounds(otherScale);
      let i4, parsed;
      function _skip() {
        parsed = _parsed[i4];
        const otherValue = parsed[otherScale.axis];
        return !isNumberFinite(parsed[scale.axis]) || otherMin > otherValue || otherMax < otherValue;
      }
      for (i4 = 0; i4 < ilen; ++i4) {
        if (_skip()) {
          continue;
        }
        this.updateRangeFromParsed(range, scale, parsed, stack);
        if (sorted) {
          break;
        }
      }
      if (sorted) {
        for (i4 = ilen - 1; i4 >= 0; --i4) {
          if (_skip()) {
            continue;
          }
          this.updateRangeFromParsed(range, scale, parsed, stack);
          break;
        }
      }
      return range;
    }
    getAllParsedValues(scale) {
      const parsed = this._cachedMeta._parsed;
      const values = [];
      let i4, ilen, value;
      for (i4 = 0, ilen = parsed.length; i4 < ilen; ++i4) {
        value = parsed[i4][scale.axis];
        if (isNumberFinite(value)) {
          values.push(value);
        }
      }
      return values;
    }
    getMaxOverflow() {
      return false;
    }
    getLabelAndValue(index) {
      const meta = this._cachedMeta;
      const iScale = meta.iScale;
      const vScale = meta.vScale;
      const parsed = this.getParsed(index);
      return {
        label: iScale ? "" + iScale.getLabelForValue(parsed[iScale.axis]) : "",
        value: vScale ? "" + vScale.getLabelForValue(parsed[vScale.axis]) : ""
      };
    }
    _update(mode) {
      const meta = this._cachedMeta;
      this.update(mode || "default");
      meta._clip = toClip(valueOrDefault(this.options.clip, defaultClip(meta.xScale, meta.yScale, this.getMaxOverflow())));
    }
    update(mode) {
    }
    draw() {
      const ctx = this._ctx;
      const chart2 = this.chart;
      const meta = this._cachedMeta;
      const elements = meta.data || [];
      const area = chart2.chartArea;
      const active = [];
      const start = this._drawStart || 0;
      const count = this._drawCount || elements.length - start;
      const drawActiveElementsOnTop = this.options.drawActiveElementsOnTop;
      let i4;
      if (meta.dataset) {
        meta.dataset.draw(ctx, area, start, count);
      }
      for (i4 = start; i4 < start + count; ++i4) {
        const element = elements[i4];
        if (element.hidden) {
          continue;
        }
        if (element.active && drawActiveElementsOnTop) {
          active.push(element);
        } else {
          element.draw(ctx, area);
        }
      }
      for (i4 = 0; i4 < active.length; ++i4) {
        active[i4].draw(ctx, area);
      }
    }
    getStyle(index, active) {
      const mode = active ? "active" : "default";
      return index === void 0 && this._cachedMeta.dataset ? this.resolveDatasetElementOptions(mode) : this.resolveDataElementOptions(index || 0, mode);
    }
    getContext(index, active, mode) {
      const dataset = this.getDataset();
      let context;
      if (index >= 0 && index < this._cachedMeta.data.length) {
        const element = this._cachedMeta.data[index];
        context = element.$context || (element.$context = createDataContext(this.getContext(), index, element));
        context.parsed = this.getParsed(index);
        context.raw = dataset.data[index];
        context.index = context.dataIndex = index;
      } else {
        context = this.$context || (this.$context = createDatasetContext(this.chart.getContext(), this.index));
        context.dataset = dataset;
        context.index = context.datasetIndex = this.index;
      }
      context.active = !!active;
      context.mode = mode;
      return context;
    }
    resolveDatasetElementOptions(mode) {
      return this._resolveElementOptions(this.datasetElementType.id, mode);
    }
    resolveDataElementOptions(index, mode) {
      return this._resolveElementOptions(this.dataElementType.id, mode, index);
    }
    _resolveElementOptions(elementType, mode = "default", index) {
      const active = mode === "active";
      const cache = this._cachedDataOpts;
      const cacheKey = elementType + "-" + mode;
      const cached = cache[cacheKey];
      const sharing = this.enableOptionSharing && defined(index);
      if (cached) {
        return cloneIfNotShared(cached, sharing);
      }
      const config = this.chart.config;
      const scopeKeys = config.datasetElementScopeKeys(this._type, elementType);
      const prefixes = active ? [`${elementType}Hover`, "hover", elementType, ""] : [elementType, ""];
      const scopes = config.getOptionScopes(this.getDataset(), scopeKeys);
      const names2 = Object.keys(defaults.elements[elementType]);
      const context = () => this.getContext(index, active);
      const values = config.resolveNamedOptions(scopes, names2, context, prefixes);
      if (values.$shared) {
        values.$shared = sharing;
        cache[cacheKey] = Object.freeze(cloneIfNotShared(values, sharing));
      }
      return values;
    }
    _resolveAnimations(index, transition, active) {
      const chart2 = this.chart;
      const cache = this._cachedDataOpts;
      const cacheKey = `animation-${transition}`;
      const cached = cache[cacheKey];
      if (cached) {
        return cached;
      }
      let options;
      if (chart2.options.animation !== false) {
        const config = this.chart.config;
        const scopeKeys = config.datasetAnimationScopeKeys(this._type, transition);
        const scopes = config.getOptionScopes(this.getDataset(), scopeKeys);
        options = config.createResolver(scopes, this.getContext(index, active, transition));
      }
      const animations = new Animations(chart2, options && options.animations);
      if (options && options._cacheable) {
        cache[cacheKey] = Object.freeze(animations);
      }
      return animations;
    }
    getSharedOptions(options) {
      if (!options.$shared) {
        return;
      }
      return this._sharedOptions || (this._sharedOptions = Object.assign({}, options));
    }
    includeOptions(mode, sharedOptions) {
      return !sharedOptions || isDirectUpdateMode(mode) || this.chart._animationsDisabled;
    }
    updateElement(element, index, properties, mode) {
      if (isDirectUpdateMode(mode)) {
        Object.assign(element, properties);
      } else {
        this._resolveAnimations(index, mode).update(element, properties);
      }
    }
    updateSharedOptions(sharedOptions, mode, newOptions) {
      if (sharedOptions && !isDirectUpdateMode(mode)) {
        this._resolveAnimations(void 0, mode).update(sharedOptions, newOptions);
      }
    }
    _setStyle(element, index, mode, active) {
      element.active = active;
      const options = this.getStyle(index, active);
      this._resolveAnimations(index, mode, active).update(element, {
        options: !active && this.getSharedOptions(options) || options
      });
    }
    removeHoverStyle(element, datasetIndex, index) {
      this._setStyle(element, index, "active", false);
    }
    setHoverStyle(element, datasetIndex, index) {
      this._setStyle(element, index, "active", true);
    }
    _removeDatasetHoverStyle() {
      const element = this._cachedMeta.dataset;
      if (element) {
        this._setStyle(element, void 0, "active", false);
      }
    }
    _setDatasetHoverStyle() {
      const element = this._cachedMeta.dataset;
      if (element) {
        this._setStyle(element, void 0, "active", true);
      }
    }
    _resyncElements(resetNewElements) {
      const data = this._data;
      const elements = this._cachedMeta.data;
      for (const [method, arg1, arg2] of this._syncList) {
        this[method](arg1, arg2);
      }
      this._syncList = [];
      const numMeta = elements.length;
      const numData = data.length;
      const count = Math.min(numData, numMeta);
      if (count) {
        this.parse(0, count);
      }
      if (numData > numMeta) {
        this._insertElements(numMeta, numData - numMeta, resetNewElements);
      } else if (numData < numMeta) {
        this._removeElements(numData, numMeta - numData);
      }
    }
    _insertElements(start, count, resetNewElements = true) {
      const meta = this._cachedMeta;
      const data = meta.data;
      const end = start + count;
      let i4;
      const move = (arr) => {
        arr.length += count;
        for (i4 = arr.length - 1; i4 >= end; i4--) {
          arr[i4] = arr[i4 - count];
        }
      };
      move(data);
      for (i4 = start; i4 < end; ++i4) {
        data[i4] = new this.dataElementType();
      }
      if (this._parsing) {
        move(meta._parsed);
      }
      this.parse(start, count);
      if (resetNewElements) {
        this.updateElements(data, start, count, "reset");
      }
    }
    updateElements(element, start, count, mode) {
    }
    _removeElements(start, count) {
      const meta = this._cachedMeta;
      if (this._parsing) {
        const removed = meta._parsed.splice(start, count);
        if (meta._stacked) {
          clearStacks(meta, removed);
        }
      }
      meta.data.splice(start, count);
    }
    _sync(args) {
      if (this._parsing) {
        this._syncList.push(args);
      } else {
        const [method, arg1, arg2] = args;
        this[method](arg1, arg2);
      }
      this.chart._dataChanges.push([this.index, ...args]);
    }
    _onDataPush() {
      const count = arguments.length;
      this._sync(["_insertElements", this.getDataset().data.length - count, count]);
    }
    _onDataPop() {
      this._sync(["_removeElements", this._cachedMeta.data.length - 1, 1]);
    }
    _onDataShift() {
      this._sync(["_removeElements", 0, 1]);
    }
    _onDataSplice(start, count) {
      if (count) {
        this._sync(["_removeElements", start, count]);
      }
      const newCount = arguments.length - 2;
      if (newCount) {
        this._sync(["_insertElements", start, newCount]);
      }
    }
    _onDataUnshift() {
      this._sync(["_insertElements", 0, arguments.length]);
    }
  };
  DatasetController.defaults = {};
  DatasetController.prototype.datasetElementType = null;
  DatasetController.prototype.dataElementType = null;
  function getAllScaleValues(scale, type) {
    if (!scale._cache.$bar) {
      const visibleMetas = scale.getMatchingVisibleMetas(type);
      let values = [];
      for (let i4 = 0, ilen = visibleMetas.length; i4 < ilen; i4++) {
        values = values.concat(visibleMetas[i4].controller.getAllParsedValues(scale));
      }
      scale._cache.$bar = _arrayUnique(values.sort((a3, b2) => a3 - b2));
    }
    return scale._cache.$bar;
  }
  function computeMinSampleSize(meta) {
    const scale = meta.iScale;
    const values = getAllScaleValues(scale, meta.type);
    let min = scale._length;
    let i4, ilen, curr, prev;
    const updateMinAndPrev = () => {
      if (curr === 32767 || curr === -32768) {
        return;
      }
      if (defined(prev)) {
        min = Math.min(min, Math.abs(curr - prev) || min);
      }
      prev = curr;
    };
    for (i4 = 0, ilen = values.length; i4 < ilen; ++i4) {
      curr = scale.getPixelForValue(values[i4]);
      updateMinAndPrev();
    }
    prev = void 0;
    for (i4 = 0, ilen = scale.ticks.length; i4 < ilen; ++i4) {
      curr = scale.getPixelForTick(i4);
      updateMinAndPrev();
    }
    return min;
  }
  function computeFitCategoryTraits(index, ruler, options, stackCount) {
    const thickness = options.barThickness;
    let size, ratio;
    if (isNullOrUndef(thickness)) {
      size = ruler.min * options.categoryPercentage;
      ratio = options.barPercentage;
    } else {
      size = thickness * stackCount;
      ratio = 1;
    }
    return {
      chunk: size / stackCount,
      ratio,
      start: ruler.pixels[index] - size / 2
    };
  }
  function computeFlexCategoryTraits(index, ruler, options, stackCount) {
    const pixels = ruler.pixels;
    const curr = pixels[index];
    let prev = index > 0 ? pixels[index - 1] : null;
    let next = index < pixels.length - 1 ? pixels[index + 1] : null;
    const percent = options.categoryPercentage;
    if (prev === null) {
      prev = curr - (next === null ? ruler.end - ruler.start : next - curr);
    }
    if (next === null) {
      next = curr + curr - prev;
    }
    const start = curr - (curr - Math.min(prev, next)) / 2 * percent;
    const size = Math.abs(next - prev) / 2 * percent;
    return {
      chunk: size / stackCount,
      ratio: options.barPercentage,
      start
    };
  }
  function parseFloatBar(entry, item, vScale, i4) {
    const startValue = vScale.parse(entry[0], i4);
    const endValue = vScale.parse(entry[1], i4);
    const min = Math.min(startValue, endValue);
    const max = Math.max(startValue, endValue);
    let barStart = min;
    let barEnd = max;
    if (Math.abs(min) > Math.abs(max)) {
      barStart = max;
      barEnd = min;
    }
    item[vScale.axis] = barEnd;
    item._custom = {
      barStart,
      barEnd,
      start: startValue,
      end: endValue,
      min,
      max
    };
  }
  function parseValue(entry, item, vScale, i4) {
    if (isArray(entry)) {
      parseFloatBar(entry, item, vScale, i4);
    } else {
      item[vScale.axis] = vScale.parse(entry, i4);
    }
    return item;
  }
  function parseArrayOrPrimitive(meta, data, start, count) {
    const iScale = meta.iScale;
    const vScale = meta.vScale;
    const labels = iScale.getLabels();
    const singleScale = iScale === vScale;
    const parsed = [];
    let i4, ilen, item, entry;
    for (i4 = start, ilen = start + count; i4 < ilen; ++i4) {
      entry = data[i4];
      item = {};
      item[iScale.axis] = singleScale || iScale.parse(labels[i4], i4);
      parsed.push(parseValue(entry, item, vScale, i4));
    }
    return parsed;
  }
  function isFloatBar(custom) {
    return custom && custom.barStart !== void 0 && custom.barEnd !== void 0;
  }
  function barSign(size, vScale, actualBase) {
    if (size !== 0) {
      return sign(size);
    }
    return (vScale.isHorizontal() ? 1 : -1) * (vScale.min >= actualBase ? 1 : -1);
  }
  function borderProps(properties) {
    let reverse, start, end, top, bottom;
    if (properties.horizontal) {
      reverse = properties.base > properties.x;
      start = "left";
      end = "right";
    } else {
      reverse = properties.base < properties.y;
      start = "bottom";
      end = "top";
    }
    if (reverse) {
      top = "end";
      bottom = "start";
    } else {
      top = "start";
      bottom = "end";
    }
    return { start, end, reverse, top, bottom };
  }
  function setBorderSkipped(properties, options, stack, index) {
    let edge = options.borderSkipped;
    const res = {};
    if (!edge) {
      properties.borderSkipped = res;
      return;
    }
    const { start, end, reverse, top, bottom } = borderProps(properties);
    if (edge === "middle" && stack) {
      properties.enableBorderRadius = true;
      if ((stack._top || 0) === index) {
        edge = top;
      } else if ((stack._bottom || 0) === index) {
        edge = bottom;
      } else {
        res[parseEdge(bottom, start, end, reverse)] = true;
        edge = top;
      }
    }
    res[parseEdge(edge, start, end, reverse)] = true;
    properties.borderSkipped = res;
  }
  function parseEdge(edge, a3, b2, reverse) {
    if (reverse) {
      edge = swap(edge, a3, b2);
      edge = startEnd(edge, b2, a3);
    } else {
      edge = startEnd(edge, a3, b2);
    }
    return edge;
  }
  function swap(orig, v1, v2) {
    return orig === v1 ? v2 : orig === v2 ? v1 : orig;
  }
  function startEnd(v2, start, end) {
    return v2 === "start" ? start : v2 === "end" ? end : v2;
  }
  function setInflateAmount(properties, { inflateAmount }, ratio) {
    properties.inflateAmount = inflateAmount === "auto" ? ratio === 1 ? 0.33 : 0 : inflateAmount;
  }
  var BarController = class extends DatasetController {
    parsePrimitiveData(meta, data, start, count) {
      return parseArrayOrPrimitive(meta, data, start, count);
    }
    parseArrayData(meta, data, start, count) {
      return parseArrayOrPrimitive(meta, data, start, count);
    }
    parseObjectData(meta, data, start, count) {
      const { iScale, vScale } = meta;
      const { xAxisKey = "x", yAxisKey = "y" } = this._parsing;
      const iAxisKey = iScale.axis === "x" ? xAxisKey : yAxisKey;
      const vAxisKey = vScale.axis === "x" ? xAxisKey : yAxisKey;
      const parsed = [];
      let i4, ilen, item, obj;
      for (i4 = start, ilen = start + count; i4 < ilen; ++i4) {
        obj = data[i4];
        item = {};
        item[iScale.axis] = iScale.parse(resolveObjectKey(obj, iAxisKey), i4);
        parsed.push(parseValue(resolveObjectKey(obj, vAxisKey), item, vScale, i4));
      }
      return parsed;
    }
    updateRangeFromParsed(range, scale, parsed, stack) {
      super.updateRangeFromParsed(range, scale, parsed, stack);
      const custom = parsed._custom;
      if (custom && scale === this._cachedMeta.vScale) {
        range.min = Math.min(range.min, custom.min);
        range.max = Math.max(range.max, custom.max);
      }
    }
    getMaxOverflow() {
      return 0;
    }
    getLabelAndValue(index) {
      const meta = this._cachedMeta;
      const { iScale, vScale } = meta;
      const parsed = this.getParsed(index);
      const custom = parsed._custom;
      const value = isFloatBar(custom) ? "[" + custom.start + ", " + custom.end + "]" : "" + vScale.getLabelForValue(parsed[vScale.axis]);
      return {
        label: "" + iScale.getLabelForValue(parsed[iScale.axis]),
        value
      };
    }
    initialize() {
      this.enableOptionSharing = true;
      super.initialize();
      const meta = this._cachedMeta;
      meta.stack = this.getDataset().stack;
    }
    update(mode) {
      const meta = this._cachedMeta;
      this.updateElements(meta.data, 0, meta.data.length, mode);
    }
    updateElements(bars, start, count, mode) {
      const reset = mode === "reset";
      const { index, _cachedMeta: { vScale } } = this;
      const base = vScale.getBasePixel();
      const horizontal = vScale.isHorizontal();
      const ruler = this._getRuler();
      const firstOpts = this.resolveDataElementOptions(start, mode);
      const sharedOptions = this.getSharedOptions(firstOpts);
      const includeOptions = this.includeOptions(mode, sharedOptions);
      this.updateSharedOptions(sharedOptions, mode, firstOpts);
      for (let i4 = start; i4 < start + count; i4++) {
        const parsed = this.getParsed(i4);
        const vpixels = reset || isNullOrUndef(parsed[vScale.axis]) ? { base, head: base } : this._calculateBarValuePixels(i4);
        const ipixels = this._calculateBarIndexPixels(i4, ruler);
        const stack = (parsed._stacks || {})[vScale.axis];
        const properties = {
          horizontal,
          base: vpixels.base,
          enableBorderRadius: !stack || isFloatBar(parsed._custom) || (index === stack._top || index === stack._bottom),
          x: horizontal ? vpixels.head : ipixels.center,
          y: horizontal ? ipixels.center : vpixels.head,
          height: horizontal ? ipixels.size : Math.abs(vpixels.size),
          width: horizontal ? Math.abs(vpixels.size) : ipixels.size
        };
        if (includeOptions) {
          properties.options = sharedOptions || this.resolveDataElementOptions(i4, bars[i4].active ? "active" : mode);
        }
        const options = properties.options || bars[i4].options;
        setBorderSkipped(properties, options, stack, index);
        setInflateAmount(properties, options, ruler.ratio);
        this.updateElement(bars[i4], i4, properties, mode);
      }
    }
    _getStacks(last, dataIndex) {
      const meta = this._cachedMeta;
      const iScale = meta.iScale;
      const metasets = iScale.getMatchingVisibleMetas(this._type);
      const stacked = iScale.options.stacked;
      const ilen = metasets.length;
      const stacks = [];
      let i4, item;
      for (i4 = 0; i4 < ilen; ++i4) {
        item = metasets[i4];
        if (!item.controller.options.grouped) {
          continue;
        }
        if (typeof dataIndex !== "undefined") {
          const val = item.controller.getParsed(dataIndex)[item.controller._cachedMeta.vScale.axis];
          if (isNullOrUndef(val) || isNaN(val)) {
            continue;
          }
        }
        if (stacked === false || stacks.indexOf(item.stack) === -1 || stacked === void 0 && item.stack === void 0) {
          stacks.push(item.stack);
        }
        if (item.index === last) {
          break;
        }
      }
      if (!stacks.length) {
        stacks.push(void 0);
      }
      return stacks;
    }
    _getStackCount(index) {
      return this._getStacks(void 0, index).length;
    }
    _getStackIndex(datasetIndex, name, dataIndex) {
      const stacks = this._getStacks(datasetIndex, dataIndex);
      const index = name !== void 0 ? stacks.indexOf(name) : -1;
      return index === -1 ? stacks.length - 1 : index;
    }
    _getRuler() {
      const opts = this.options;
      const meta = this._cachedMeta;
      const iScale = meta.iScale;
      const pixels = [];
      let i4, ilen;
      for (i4 = 0, ilen = meta.data.length; i4 < ilen; ++i4) {
        pixels.push(iScale.getPixelForValue(this.getParsed(i4)[iScale.axis], i4));
      }
      const barThickness = opts.barThickness;
      const min = barThickness || computeMinSampleSize(meta);
      return {
        min,
        pixels,
        start: iScale._startPixel,
        end: iScale._endPixel,
        stackCount: this._getStackCount(),
        scale: iScale,
        grouped: opts.grouped,
        ratio: barThickness ? 1 : opts.categoryPercentage * opts.barPercentage
      };
    }
    _calculateBarValuePixels(index) {
      const { _cachedMeta: { vScale, _stacked }, options: { base: baseValue, minBarLength } } = this;
      const actualBase = baseValue || 0;
      const parsed = this.getParsed(index);
      const custom = parsed._custom;
      const floating = isFloatBar(custom);
      let value = parsed[vScale.axis];
      let start = 0;
      let length = _stacked ? this.applyStack(vScale, parsed, _stacked) : value;
      let head, size;
      if (length !== value) {
        start = length - value;
        length = value;
      }
      if (floating) {
        value = custom.barStart;
        length = custom.barEnd - custom.barStart;
        if (value !== 0 && sign(value) !== sign(custom.barEnd)) {
          start = 0;
        }
        start += value;
      }
      const startValue = !isNullOrUndef(baseValue) && !floating ? baseValue : start;
      let base = vScale.getPixelForValue(startValue);
      if (this.chart.getDataVisibility(index)) {
        head = vScale.getPixelForValue(start + length);
      } else {
        head = base;
      }
      size = head - base;
      if (Math.abs(size) < minBarLength) {
        size = barSign(size, vScale, actualBase) * minBarLength;
        if (value === actualBase) {
          base -= size / 2;
        }
        head = base + size;
      }
      if (base === vScale.getPixelForValue(actualBase)) {
        const halfGrid = sign(size) * vScale.getLineWidthForValue(actualBase) / 2;
        base += halfGrid;
        size -= halfGrid;
      }
      return {
        size,
        base,
        head,
        center: head + size / 2
      };
    }
    _calculateBarIndexPixels(index, ruler) {
      const scale = ruler.scale;
      const options = this.options;
      const skipNull = options.skipNull;
      const maxBarThickness = valueOrDefault(options.maxBarThickness, Infinity);
      let center, size;
      if (ruler.grouped) {
        const stackCount = skipNull ? this._getStackCount(index) : ruler.stackCount;
        const range = options.barThickness === "flex" ? computeFlexCategoryTraits(index, ruler, options, stackCount) : computeFitCategoryTraits(index, ruler, options, stackCount);
        const stackIndex = this._getStackIndex(this.index, this._cachedMeta.stack, skipNull ? index : void 0);
        center = range.start + range.chunk * stackIndex + range.chunk / 2;
        size = Math.min(maxBarThickness, range.chunk * range.ratio);
      } else {
        center = scale.getPixelForValue(this.getParsed(index)[scale.axis], index);
        size = Math.min(maxBarThickness, ruler.min * ruler.ratio);
      }
      return {
        base: center - size / 2,
        head: center + size / 2,
        center,
        size
      };
    }
    draw() {
      const meta = this._cachedMeta;
      const vScale = meta.vScale;
      const rects = meta.data;
      const ilen = rects.length;
      let i4 = 0;
      for (; i4 < ilen; ++i4) {
        if (this.getParsed(i4)[vScale.axis] !== null) {
          rects[i4].draw(this._ctx);
        }
      }
    }
  };
  BarController.id = "bar";
  BarController.defaults = {
    datasetElementType: false,
    dataElementType: "bar",
    categoryPercentage: 0.8,
    barPercentage: 0.9,
    grouped: true,
    animations: {
      numbers: {
        type: "number",
        properties: ["x", "y", "base", "width", "height"]
      }
    }
  };
  BarController.overrides = {
    scales: {
      _index_: {
        type: "category",
        offset: true,
        grid: {
          offset: true
        }
      },
      _value_: {
        type: "linear",
        beginAtZero: true
      }
    }
  };
  var BubbleController = class extends DatasetController {
    initialize() {
      this.enableOptionSharing = true;
      super.initialize();
    }
    parsePrimitiveData(meta, data, start, count) {
      const parsed = super.parsePrimitiveData(meta, data, start, count);
      for (let i4 = 0; i4 < parsed.length; i4++) {
        parsed[i4]._custom = this.resolveDataElementOptions(i4 + start).radius;
      }
      return parsed;
    }
    parseArrayData(meta, data, start, count) {
      const parsed = super.parseArrayData(meta, data, start, count);
      for (let i4 = 0; i4 < parsed.length; i4++) {
        const item = data[start + i4];
        parsed[i4]._custom = valueOrDefault(item[2], this.resolveDataElementOptions(i4 + start).radius);
      }
      return parsed;
    }
    parseObjectData(meta, data, start, count) {
      const parsed = super.parseObjectData(meta, data, start, count);
      for (let i4 = 0; i4 < parsed.length; i4++) {
        const item = data[start + i4];
        parsed[i4]._custom = valueOrDefault(item && item.r && +item.r, this.resolveDataElementOptions(i4 + start).radius);
      }
      return parsed;
    }
    getMaxOverflow() {
      const data = this._cachedMeta.data;
      let max = 0;
      for (let i4 = data.length - 1; i4 >= 0; --i4) {
        max = Math.max(max, data[i4].size(this.resolveDataElementOptions(i4)) / 2);
      }
      return max > 0 && max;
    }
    getLabelAndValue(index) {
      const meta = this._cachedMeta;
      const { xScale, yScale } = meta;
      const parsed = this.getParsed(index);
      const x2 = xScale.getLabelForValue(parsed.x);
      const y2 = yScale.getLabelForValue(parsed.y);
      const r3 = parsed._custom;
      return {
        label: meta.label,
        value: "(" + x2 + ", " + y2 + (r3 ? ", " + r3 : "") + ")"
      };
    }
    update(mode) {
      const points = this._cachedMeta.data;
      this.updateElements(points, 0, points.length, mode);
    }
    updateElements(points, start, count, mode) {
      const reset = mode === "reset";
      const { iScale, vScale } = this._cachedMeta;
      const firstOpts = this.resolveDataElementOptions(start, mode);
      const sharedOptions = this.getSharedOptions(firstOpts);
      const includeOptions = this.includeOptions(mode, sharedOptions);
      const iAxis = iScale.axis;
      const vAxis = vScale.axis;
      for (let i4 = start; i4 < start + count; i4++) {
        const point = points[i4];
        const parsed = !reset && this.getParsed(i4);
        const properties = {};
        const iPixel = properties[iAxis] = reset ? iScale.getPixelForDecimal(0.5) : iScale.getPixelForValue(parsed[iAxis]);
        const vPixel = properties[vAxis] = reset ? vScale.getBasePixel() : vScale.getPixelForValue(parsed[vAxis]);
        properties.skip = isNaN(iPixel) || isNaN(vPixel);
        if (includeOptions) {
          properties.options = this.resolveDataElementOptions(i4, point.active ? "active" : mode);
          if (reset) {
            properties.options.radius = 0;
          }
        }
        this.updateElement(point, i4, properties, mode);
      }
      this.updateSharedOptions(sharedOptions, mode, firstOpts);
    }
    resolveDataElementOptions(index, mode) {
      const parsed = this.getParsed(index);
      let values = super.resolveDataElementOptions(index, mode);
      if (values.$shared) {
        values = Object.assign({}, values, { $shared: false });
      }
      const radius = values.radius;
      if (mode !== "active") {
        values.radius = 0;
      }
      values.radius += valueOrDefault(parsed && parsed._custom, radius);
      return values;
    }
  };
  BubbleController.id = "bubble";
  BubbleController.defaults = {
    datasetElementType: false,
    dataElementType: "point",
    animations: {
      numbers: {
        type: "number",
        properties: ["x", "y", "borderWidth", "radius"]
      }
    }
  };
  BubbleController.overrides = {
    scales: {
      x: {
        type: "linear"
      },
      y: {
        type: "linear"
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          title() {
            return "";
          }
        }
      }
    }
  };
  function getRatioAndOffset(rotation, circumference, cutout) {
    let ratioX = 1;
    let ratioY = 1;
    let offsetX = 0;
    let offsetY = 0;
    if (circumference < TAU) {
      const startAngle = rotation;
      const endAngle = startAngle + circumference;
      const startX = Math.cos(startAngle);
      const startY = Math.sin(startAngle);
      const endX = Math.cos(endAngle);
      const endY = Math.sin(endAngle);
      const calcMax = (angle, a3, b2) => _angleBetween(angle, startAngle, endAngle, true) ? 1 : Math.max(a3, a3 * cutout, b2, b2 * cutout);
      const calcMin = (angle, a3, b2) => _angleBetween(angle, startAngle, endAngle, true) ? -1 : Math.min(a3, a3 * cutout, b2, b2 * cutout);
      const maxX = calcMax(0, startX, endX);
      const maxY = calcMax(HALF_PI, startY, endY);
      const minX = calcMin(PI, startX, endX);
      const minY = calcMin(PI + HALF_PI, startY, endY);
      ratioX = (maxX - minX) / 2;
      ratioY = (maxY - minY) / 2;
      offsetX = -(maxX + minX) / 2;
      offsetY = -(maxY + minY) / 2;
    }
    return { ratioX, ratioY, offsetX, offsetY };
  }
  var DoughnutController = class extends DatasetController {
    constructor(chart2, datasetIndex) {
      super(chart2, datasetIndex);
      this.enableOptionSharing = true;
      this.innerRadius = void 0;
      this.outerRadius = void 0;
      this.offsetX = void 0;
      this.offsetY = void 0;
    }
    linkScales() {
    }
    parse(start, count) {
      const data = this.getDataset().data;
      const meta = this._cachedMeta;
      if (this._parsing === false) {
        meta._parsed = data;
      } else {
        let getter = (i5) => +data[i5];
        if (isObject(data[start])) {
          const { key = "value" } = this._parsing;
          getter = (i5) => +resolveObjectKey(data[i5], key);
        }
        let i4, ilen;
        for (i4 = start, ilen = start + count; i4 < ilen; ++i4) {
          meta._parsed[i4] = getter(i4);
        }
      }
    }
    _getRotation() {
      return toRadians(this.options.rotation - 90);
    }
    _getCircumference() {
      return toRadians(this.options.circumference);
    }
    _getRotationExtents() {
      let min = TAU;
      let max = -TAU;
      for (let i4 = 0; i4 < this.chart.data.datasets.length; ++i4) {
        if (this.chart.isDatasetVisible(i4)) {
          const controller = this.chart.getDatasetMeta(i4).controller;
          const rotation = controller._getRotation();
          const circumference = controller._getCircumference();
          min = Math.min(min, rotation);
          max = Math.max(max, rotation + circumference);
        }
      }
      return {
        rotation: min,
        circumference: max - min
      };
    }
    update(mode) {
      const chart2 = this.chart;
      const { chartArea } = chart2;
      const meta = this._cachedMeta;
      const arcs = meta.data;
      const spacing = this.getMaxBorderWidth() + this.getMaxOffset(arcs) + this.options.spacing;
      const maxSize = Math.max((Math.min(chartArea.width, chartArea.height) - spacing) / 2, 0);
      const cutout = Math.min(toPercentage(this.options.cutout, maxSize), 1);
      const chartWeight = this._getRingWeight(this.index);
      const { circumference, rotation } = this._getRotationExtents();
      const { ratioX, ratioY, offsetX, offsetY } = getRatioAndOffset(rotation, circumference, cutout);
      const maxWidth = (chartArea.width - spacing) / ratioX;
      const maxHeight = (chartArea.height - spacing) / ratioY;
      const maxRadius = Math.max(Math.min(maxWidth, maxHeight) / 2, 0);
      const outerRadius = toDimension(this.options.radius, maxRadius);
      const innerRadius = Math.max(outerRadius * cutout, 0);
      const radiusLength = (outerRadius - innerRadius) / this._getVisibleDatasetWeightTotal();
      this.offsetX = offsetX * outerRadius;
      this.offsetY = offsetY * outerRadius;
      meta.total = this.calculateTotal();
      this.outerRadius = outerRadius - radiusLength * this._getRingWeightOffset(this.index);
      this.innerRadius = Math.max(this.outerRadius - radiusLength * chartWeight, 0);
      this.updateElements(arcs, 0, arcs.length, mode);
    }
    _circumference(i4, reset) {
      const opts = this.options;
      const meta = this._cachedMeta;
      const circumference = this._getCircumference();
      if (reset && opts.animation.animateRotate || !this.chart.getDataVisibility(i4) || meta._parsed[i4] === null || meta.data[i4].hidden) {
        return 0;
      }
      return this.calculateCircumference(meta._parsed[i4] * circumference / TAU);
    }
    updateElements(arcs, start, count, mode) {
      const reset = mode === "reset";
      const chart2 = this.chart;
      const chartArea = chart2.chartArea;
      const opts = chart2.options;
      const animationOpts = opts.animation;
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;
      const animateScale = reset && animationOpts.animateScale;
      const innerRadius = animateScale ? 0 : this.innerRadius;
      const outerRadius = animateScale ? 0 : this.outerRadius;
      const firstOpts = this.resolveDataElementOptions(start, mode);
      const sharedOptions = this.getSharedOptions(firstOpts);
      const includeOptions = this.includeOptions(mode, sharedOptions);
      let startAngle = this._getRotation();
      let i4;
      for (i4 = 0; i4 < start; ++i4) {
        startAngle += this._circumference(i4, reset);
      }
      for (i4 = start; i4 < start + count; ++i4) {
        const circumference = this._circumference(i4, reset);
        const arc = arcs[i4];
        const properties = {
          x: centerX + this.offsetX,
          y: centerY + this.offsetY,
          startAngle,
          endAngle: startAngle + circumference,
          circumference,
          outerRadius,
          innerRadius
        };
        if (includeOptions) {
          properties.options = sharedOptions || this.resolveDataElementOptions(i4, arc.active ? "active" : mode);
        }
        startAngle += circumference;
        this.updateElement(arc, i4, properties, mode);
      }
      this.updateSharedOptions(sharedOptions, mode, firstOpts);
    }
    calculateTotal() {
      const meta = this._cachedMeta;
      const metaData = meta.data;
      let total = 0;
      let i4;
      for (i4 = 0; i4 < metaData.length; i4++) {
        const value = meta._parsed[i4];
        if (value !== null && !isNaN(value) && this.chart.getDataVisibility(i4) && !metaData[i4].hidden) {
          total += Math.abs(value);
        }
      }
      return total;
    }
    calculateCircumference(value) {
      const total = this._cachedMeta.total;
      if (total > 0 && !isNaN(value)) {
        return TAU * (Math.abs(value) / total);
      }
      return 0;
    }
    getLabelAndValue(index) {
      const meta = this._cachedMeta;
      const chart2 = this.chart;
      const labels = chart2.data.labels || [];
      const value = formatNumber(meta._parsed[index], chart2.options.locale);
      return {
        label: labels[index] || "",
        value
      };
    }
    getMaxBorderWidth(arcs) {
      let max = 0;
      const chart2 = this.chart;
      let i4, ilen, meta, controller, options;
      if (!arcs) {
        for (i4 = 0, ilen = chart2.data.datasets.length; i4 < ilen; ++i4) {
          if (chart2.isDatasetVisible(i4)) {
            meta = chart2.getDatasetMeta(i4);
            arcs = meta.data;
            controller = meta.controller;
            break;
          }
        }
      }
      if (!arcs) {
        return 0;
      }
      for (i4 = 0, ilen = arcs.length; i4 < ilen; ++i4) {
        options = controller.resolveDataElementOptions(i4);
        if (options.borderAlign !== "inner") {
          max = Math.max(max, options.borderWidth || 0, options.hoverBorderWidth || 0);
        }
      }
      return max;
    }
    getMaxOffset(arcs) {
      let max = 0;
      for (let i4 = 0, ilen = arcs.length; i4 < ilen; ++i4) {
        const options = this.resolveDataElementOptions(i4);
        max = Math.max(max, options.offset || 0, options.hoverOffset || 0);
      }
      return max;
    }
    _getRingWeightOffset(datasetIndex) {
      let ringWeightOffset = 0;
      for (let i4 = 0; i4 < datasetIndex; ++i4) {
        if (this.chart.isDatasetVisible(i4)) {
          ringWeightOffset += this._getRingWeight(i4);
        }
      }
      return ringWeightOffset;
    }
    _getRingWeight(datasetIndex) {
      return Math.max(valueOrDefault(this.chart.data.datasets[datasetIndex].weight, 1), 0);
    }
    _getVisibleDatasetWeightTotal() {
      return this._getRingWeightOffset(this.chart.data.datasets.length) || 1;
    }
  };
  DoughnutController.id = "doughnut";
  DoughnutController.defaults = {
    datasetElementType: false,
    dataElementType: "arc",
    animation: {
      animateRotate: true,
      animateScale: false
    },
    animations: {
      numbers: {
        type: "number",
        properties: ["circumference", "endAngle", "innerRadius", "outerRadius", "startAngle", "x", "y", "offset", "borderWidth", "spacing"]
      }
    },
    cutout: "50%",
    rotation: 0,
    circumference: 360,
    radius: "100%",
    spacing: 0,
    indexAxis: "r"
  };
  DoughnutController.descriptors = {
    _scriptable: (name) => name !== "spacing",
    _indexable: (name) => name !== "spacing"
  };
  DoughnutController.overrides = {
    aspectRatio: 1,
    plugins: {
      legend: {
        labels: {
          generateLabels(chart2) {
            const data = chart2.data;
            if (data.labels.length && data.datasets.length) {
              const { labels: { pointStyle } } = chart2.legend.options;
              return data.labels.map((label, i4) => {
                const meta = chart2.getDatasetMeta(0);
                const style = meta.controller.getStyle(i4);
                return {
                  text: label,
                  fillStyle: style.backgroundColor,
                  strokeStyle: style.borderColor,
                  lineWidth: style.borderWidth,
                  pointStyle,
                  hidden: !chart2.getDataVisibility(i4),
                  index: i4
                };
              });
            }
            return [];
          }
        },
        onClick(e5, legendItem, legend) {
          legend.chart.toggleDataVisibility(legendItem.index);
          legend.chart.update();
        }
      },
      tooltip: {
        callbacks: {
          title() {
            return "";
          },
          label(tooltipItem) {
            let dataLabel = tooltipItem.label;
            const value = ": " + tooltipItem.formattedValue;
            if (isArray(dataLabel)) {
              dataLabel = dataLabel.slice();
              dataLabel[0] += value;
            } else {
              dataLabel += value;
            }
            return dataLabel;
          }
        }
      }
    }
  };
  var LineController = class extends DatasetController {
    initialize() {
      this.enableOptionSharing = true;
      super.initialize();
    }
    update(mode) {
      const meta = this._cachedMeta;
      const { dataset: line, data: points = [], _dataset } = meta;
      const animationsDisabled = this.chart._animationsDisabled;
      let { start, count } = getStartAndCountOfVisiblePoints(meta, points, animationsDisabled);
      this._drawStart = start;
      this._drawCount = count;
      if (scaleRangesChanged(meta)) {
        start = 0;
        count = points.length;
      }
      line._chart = this.chart;
      line._datasetIndex = this.index;
      line._decimated = !!_dataset._decimated;
      line.points = points;
      const options = this.resolveDatasetElementOptions(mode);
      if (!this.options.showLine) {
        options.borderWidth = 0;
      }
      options.segment = this.options.segment;
      this.updateElement(line, void 0, {
        animated: !animationsDisabled,
        options
      }, mode);
      this.updateElements(points, start, count, mode);
    }
    updateElements(points, start, count, mode) {
      const reset = mode === "reset";
      const { iScale, vScale, _stacked, _dataset } = this._cachedMeta;
      const firstOpts = this.resolveDataElementOptions(start, mode);
      const sharedOptions = this.getSharedOptions(firstOpts);
      const includeOptions = this.includeOptions(mode, sharedOptions);
      const iAxis = iScale.axis;
      const vAxis = vScale.axis;
      const { spanGaps, segment } = this.options;
      const maxGapLength = isNumber(spanGaps) ? spanGaps : Number.POSITIVE_INFINITY;
      const directUpdate = this.chart._animationsDisabled || reset || mode === "none";
      let prevParsed = start > 0 && this.getParsed(start - 1);
      for (let i4 = start; i4 < start + count; ++i4) {
        const point = points[i4];
        const parsed = this.getParsed(i4);
        const properties = directUpdate ? point : {};
        const nullData = isNullOrUndef(parsed[vAxis]);
        const iPixel = properties[iAxis] = iScale.getPixelForValue(parsed[iAxis], i4);
        const vPixel = properties[vAxis] = reset || nullData ? vScale.getBasePixel() : vScale.getPixelForValue(_stacked ? this.applyStack(vScale, parsed, _stacked) : parsed[vAxis], i4);
        properties.skip = isNaN(iPixel) || isNaN(vPixel) || nullData;
        properties.stop = i4 > 0 && parsed[iAxis] - prevParsed[iAxis] > maxGapLength;
        if (segment) {
          properties.parsed = parsed;
          properties.raw = _dataset.data[i4];
        }
        if (includeOptions) {
          properties.options = sharedOptions || this.resolveDataElementOptions(i4, point.active ? "active" : mode);
        }
        if (!directUpdate) {
          this.updateElement(point, i4, properties, mode);
        }
        prevParsed = parsed;
      }
      this.updateSharedOptions(sharedOptions, mode, firstOpts);
    }
    getMaxOverflow() {
      const meta = this._cachedMeta;
      const dataset = meta.dataset;
      const border = dataset.options && dataset.options.borderWidth || 0;
      const data = meta.data || [];
      if (!data.length) {
        return border;
      }
      const firstPoint = data[0].size(this.resolveDataElementOptions(0));
      const lastPoint = data[data.length - 1].size(this.resolveDataElementOptions(data.length - 1));
      return Math.max(border, firstPoint, lastPoint) / 2;
    }
    draw() {
      const meta = this._cachedMeta;
      meta.dataset.updateControlPoints(this.chart.chartArea, meta.iScale.axis);
      super.draw();
    }
  };
  LineController.id = "line";
  LineController.defaults = {
    datasetElementType: "line",
    dataElementType: "point",
    showLine: true,
    spanGaps: false
  };
  LineController.overrides = {
    scales: {
      _index_: {
        type: "category"
      },
      _value_: {
        type: "linear"
      }
    }
  };
  function getStartAndCountOfVisiblePoints(meta, points, animationsDisabled) {
    const pointCount = points.length;
    let start = 0;
    let count = pointCount;
    if (meta._sorted) {
      const { iScale, _parsed } = meta;
      const axis = iScale.axis;
      const { min, max, minDefined, maxDefined } = iScale.getUserBounds();
      if (minDefined) {
        start = _limitValue(Math.min(_lookupByKey(_parsed, iScale.axis, min).lo, animationsDisabled ? pointCount : _lookupByKey(points, axis, iScale.getPixelForValue(min)).lo), 0, pointCount - 1);
      }
      if (maxDefined) {
        count = _limitValue(Math.max(_lookupByKey(_parsed, iScale.axis, max).hi + 1, animationsDisabled ? 0 : _lookupByKey(points, axis, iScale.getPixelForValue(max)).hi + 1), start, pointCount) - start;
      } else {
        count = pointCount - start;
      }
    }
    return { start, count };
  }
  function scaleRangesChanged(meta) {
    const { xScale, yScale, _scaleRanges } = meta;
    const newRanges = {
      xmin: xScale.min,
      xmax: xScale.max,
      ymin: yScale.min,
      ymax: yScale.max
    };
    if (!_scaleRanges) {
      meta._scaleRanges = newRanges;
      return true;
    }
    const changed = _scaleRanges.xmin !== xScale.min || _scaleRanges.xmax !== xScale.max || _scaleRanges.ymin !== yScale.min || _scaleRanges.ymax !== yScale.max;
    Object.assign(_scaleRanges, newRanges);
    return changed;
  }
  var PolarAreaController = class extends DatasetController {
    constructor(chart2, datasetIndex) {
      super(chart2, datasetIndex);
      this.innerRadius = void 0;
      this.outerRadius = void 0;
    }
    getLabelAndValue(index) {
      const meta = this._cachedMeta;
      const chart2 = this.chart;
      const labels = chart2.data.labels || [];
      const value = formatNumber(meta._parsed[index].r, chart2.options.locale);
      return {
        label: labels[index] || "",
        value
      };
    }
    update(mode) {
      const arcs = this._cachedMeta.data;
      this._updateRadius();
      this.updateElements(arcs, 0, arcs.length, mode);
    }
    _updateRadius() {
      const chart2 = this.chart;
      const chartArea = chart2.chartArea;
      const opts = chart2.options;
      const minSize = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
      const outerRadius = Math.max(minSize / 2, 0);
      const innerRadius = Math.max(opts.cutoutPercentage ? outerRadius / 100 * opts.cutoutPercentage : 1, 0);
      const radiusLength = (outerRadius - innerRadius) / chart2.getVisibleDatasetCount();
      this.outerRadius = outerRadius - radiusLength * this.index;
      this.innerRadius = this.outerRadius - radiusLength;
    }
    updateElements(arcs, start, count, mode) {
      const reset = mode === "reset";
      const chart2 = this.chart;
      const dataset = this.getDataset();
      const opts = chart2.options;
      const animationOpts = opts.animation;
      const scale = this._cachedMeta.rScale;
      const centerX = scale.xCenter;
      const centerY = scale.yCenter;
      const datasetStartAngle = scale.getIndexAngle(0) - 0.5 * PI;
      let angle = datasetStartAngle;
      let i4;
      const defaultAngle = 360 / this.countVisibleElements();
      for (i4 = 0; i4 < start; ++i4) {
        angle += this._computeAngle(i4, mode, defaultAngle);
      }
      for (i4 = start; i4 < start + count; i4++) {
        const arc = arcs[i4];
        let startAngle = angle;
        let endAngle = angle + this._computeAngle(i4, mode, defaultAngle);
        let outerRadius = chart2.getDataVisibility(i4) ? scale.getDistanceFromCenterForValue(dataset.data[i4]) : 0;
        angle = endAngle;
        if (reset) {
          if (animationOpts.animateScale) {
            outerRadius = 0;
          }
          if (animationOpts.animateRotate) {
            startAngle = endAngle = datasetStartAngle;
          }
        }
        const properties = {
          x: centerX,
          y: centerY,
          innerRadius: 0,
          outerRadius,
          startAngle,
          endAngle,
          options: this.resolveDataElementOptions(i4, arc.active ? "active" : mode)
        };
        this.updateElement(arc, i4, properties, mode);
      }
    }
    countVisibleElements() {
      const dataset = this.getDataset();
      const meta = this._cachedMeta;
      let count = 0;
      meta.data.forEach((element, index) => {
        if (!isNaN(dataset.data[index]) && this.chart.getDataVisibility(index)) {
          count++;
        }
      });
      return count;
    }
    _computeAngle(index, mode, defaultAngle) {
      return this.chart.getDataVisibility(index) ? toRadians(this.resolveDataElementOptions(index, mode).angle || defaultAngle) : 0;
    }
  };
  PolarAreaController.id = "polarArea";
  PolarAreaController.defaults = {
    dataElementType: "arc",
    animation: {
      animateRotate: true,
      animateScale: true
    },
    animations: {
      numbers: {
        type: "number",
        properties: ["x", "y", "startAngle", "endAngle", "innerRadius", "outerRadius"]
      }
    },
    indexAxis: "r",
    startAngle: 0
  };
  PolarAreaController.overrides = {
    aspectRatio: 1,
    plugins: {
      legend: {
        labels: {
          generateLabels(chart2) {
            const data = chart2.data;
            if (data.labels.length && data.datasets.length) {
              const { labels: { pointStyle } } = chart2.legend.options;
              return data.labels.map((label, i4) => {
                const meta = chart2.getDatasetMeta(0);
                const style = meta.controller.getStyle(i4);
                return {
                  text: label,
                  fillStyle: style.backgroundColor,
                  strokeStyle: style.borderColor,
                  lineWidth: style.borderWidth,
                  pointStyle,
                  hidden: !chart2.getDataVisibility(i4),
                  index: i4
                };
              });
            }
            return [];
          }
        },
        onClick(e5, legendItem, legend) {
          legend.chart.toggleDataVisibility(legendItem.index);
          legend.chart.update();
        }
      },
      tooltip: {
        callbacks: {
          title() {
            return "";
          },
          label(context) {
            return context.chart.data.labels[context.dataIndex] + ": " + context.formattedValue;
          }
        }
      }
    },
    scales: {
      r: {
        type: "radialLinear",
        angleLines: {
          display: false
        },
        beginAtZero: true,
        grid: {
          circular: true
        },
        pointLabels: {
          display: false
        },
        startAngle: 0
      }
    }
  };
  var PieController = class extends DoughnutController {
  };
  PieController.id = "pie";
  PieController.defaults = {
    cutout: 0,
    rotation: 0,
    circumference: 360,
    radius: "100%"
  };
  var RadarController = class extends DatasetController {
    getLabelAndValue(index) {
      const vScale = this._cachedMeta.vScale;
      const parsed = this.getParsed(index);
      return {
        label: vScale.getLabels()[index],
        value: "" + vScale.getLabelForValue(parsed[vScale.axis])
      };
    }
    update(mode) {
      const meta = this._cachedMeta;
      const line = meta.dataset;
      const points = meta.data || [];
      const labels = meta.iScale.getLabels();
      line.points = points;
      if (mode !== "resize") {
        const options = this.resolveDatasetElementOptions(mode);
        if (!this.options.showLine) {
          options.borderWidth = 0;
        }
        const properties = {
          _loop: true,
          _fullLoop: labels.length === points.length,
          options
        };
        this.updateElement(line, void 0, properties, mode);
      }
      this.updateElements(points, 0, points.length, mode);
    }
    updateElements(points, start, count, mode) {
      const dataset = this.getDataset();
      const scale = this._cachedMeta.rScale;
      const reset = mode === "reset";
      for (let i4 = start; i4 < start + count; i4++) {
        const point = points[i4];
        const options = this.resolveDataElementOptions(i4, point.active ? "active" : mode);
        const pointPosition = scale.getPointPositionForValue(i4, dataset.data[i4]);
        const x2 = reset ? scale.xCenter : pointPosition.x;
        const y2 = reset ? scale.yCenter : pointPosition.y;
        const properties = {
          x: x2,
          y: y2,
          angle: pointPosition.angle,
          skip: isNaN(x2) || isNaN(y2),
          options
        };
        this.updateElement(point, i4, properties, mode);
      }
    }
  };
  RadarController.id = "radar";
  RadarController.defaults = {
    datasetElementType: "line",
    dataElementType: "point",
    indexAxis: "r",
    showLine: true,
    elements: {
      line: {
        fill: "start"
      }
    }
  };
  RadarController.overrides = {
    aspectRatio: 1,
    scales: {
      r: {
        type: "radialLinear"
      }
    }
  };
  var ScatterController = class extends LineController {
  };
  ScatterController.id = "scatter";
  ScatterController.defaults = {
    showLine: false,
    fill: false
  };
  ScatterController.overrides = {
    interaction: {
      mode: "point"
    },
    plugins: {
      tooltip: {
        callbacks: {
          title() {
            return "";
          },
          label(item) {
            return "(" + item.label + ", " + item.formattedValue + ")";
          }
        }
      }
    },
    scales: {
      x: {
        type: "linear"
      },
      y: {
        type: "linear"
      }
    }
  };
  function abstract() {
    throw new Error("This method is not implemented: Check that a complete date adapter is provided.");
  }
  var DateAdapter = class {
    constructor(options) {
      this.options = options || {};
    }
    formats() {
      return abstract();
    }
    parse(value, format2) {
      return abstract();
    }
    format(timestamp, format2) {
      return abstract();
    }
    add(timestamp, amount, unit) {
      return abstract();
    }
    diff(a3, b2, unit) {
      return abstract();
    }
    startOf(timestamp, unit, weekday) {
      return abstract();
    }
    endOf(timestamp, unit) {
      return abstract();
    }
  };
  DateAdapter.override = function(members) {
    Object.assign(DateAdapter.prototype, members);
  };
  var adapters = {
    _date: DateAdapter
  };
  function getRelativePosition2(e5, chart2) {
    if ("native" in e5) {
      return {
        x: e5.x,
        y: e5.y
      };
    }
    return getRelativePosition(e5, chart2);
  }
  function evaluateAllVisibleItems(chart2, handler) {
    const metasets = chart2.getSortedVisibleDatasetMetas();
    let index, data, element;
    for (let i4 = 0, ilen = metasets.length; i4 < ilen; ++i4) {
      ({ index, data } = metasets[i4]);
      for (let j = 0, jlen = data.length; j < jlen; ++j) {
        element = data[j];
        if (!element.skip) {
          handler(element, index, j);
        }
      }
    }
  }
  function binarySearch(metaset, axis, value, intersect) {
    const { controller, data, _sorted } = metaset;
    const iScale = controller._cachedMeta.iScale;
    if (iScale && axis === iScale.axis && axis !== "r" && _sorted && data.length) {
      const lookupMethod = iScale._reversePixels ? _rlookupByKey : _lookupByKey;
      if (!intersect) {
        return lookupMethod(data, axis, value);
      } else if (controller._sharedOptions) {
        const el = data[0];
        const range = typeof el.getRange === "function" && el.getRange(axis);
        if (range) {
          const start = lookupMethod(data, axis, value - range);
          const end = lookupMethod(data, axis, value + range);
          return { lo: start.lo, hi: end.hi };
        }
      }
    }
    return { lo: 0, hi: data.length - 1 };
  }
  function optimizedEvaluateItems(chart2, axis, position, handler, intersect) {
    const metasets = chart2.getSortedVisibleDatasetMetas();
    const value = position[axis];
    for (let i4 = 0, ilen = metasets.length; i4 < ilen; ++i4) {
      const { index, data } = metasets[i4];
      const { lo, hi } = binarySearch(metasets[i4], axis, value, intersect);
      for (let j = lo; j <= hi; ++j) {
        const element = data[j];
        if (!element.skip) {
          handler(element, index, j);
        }
      }
    }
  }
  function getDistanceMetricForAxis(axis) {
    const useX = axis.indexOf("x") !== -1;
    const useY = axis.indexOf("y") !== -1;
    return function(pt1, pt2) {
      const deltaX = useX ? Math.abs(pt1.x - pt2.x) : 0;
      const deltaY = useY ? Math.abs(pt1.y - pt2.y) : 0;
      return Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
    };
  }
  function getIntersectItems(chart2, position, axis, useFinalPosition) {
    const items = [];
    if (!_isPointInArea(position, chart2.chartArea, chart2._minPadding)) {
      return items;
    }
    const evaluationFunc = function(element, datasetIndex, index) {
      if (element.inRange(position.x, position.y, useFinalPosition)) {
        items.push({ element, datasetIndex, index });
      }
    };
    optimizedEvaluateItems(chart2, axis, position, evaluationFunc, true);
    return items;
  }
  function getNearestRadialItems(chart2, position, axis, useFinalPosition) {
    let items = [];
    function evaluationFunc(element, datasetIndex, index) {
      const { startAngle, endAngle } = element.getProps(["startAngle", "endAngle"], useFinalPosition);
      const { angle } = getAngleFromPoint(element, { x: position.x, y: position.y });
      if (_angleBetween(angle, startAngle, endAngle)) {
        items.push({ element, datasetIndex, index });
      }
    }
    optimizedEvaluateItems(chart2, axis, position, evaluationFunc);
    return items;
  }
  function getNearestCartesianItems(chart2, position, axis, intersect, useFinalPosition) {
    let items = [];
    const distanceMetric = getDistanceMetricForAxis(axis);
    let minDistance = Number.POSITIVE_INFINITY;
    function evaluationFunc(element, datasetIndex, index) {
      const inRange2 = element.inRange(position.x, position.y, useFinalPosition);
      if (intersect && !inRange2) {
        return;
      }
      const center = element.getCenterPoint(useFinalPosition);
      const pointInArea = _isPointInArea(center, chart2.chartArea, chart2._minPadding);
      if (!pointInArea && !inRange2) {
        return;
      }
      const distance = distanceMetric(position, center);
      if (distance < minDistance) {
        items = [{ element, datasetIndex, index }];
        minDistance = distance;
      } else if (distance === minDistance) {
        items.push({ element, datasetIndex, index });
      }
    }
    optimizedEvaluateItems(chart2, axis, position, evaluationFunc);
    return items;
  }
  function getNearestItems(chart2, position, axis, intersect, useFinalPosition) {
    if (!_isPointInArea(position, chart2.chartArea, chart2._minPadding)) {
      return [];
    }
    return axis === "r" && !intersect ? getNearestRadialItems(chart2, position, axis, useFinalPosition) : getNearestCartesianItems(chart2, position, axis, intersect, useFinalPosition);
  }
  function getAxisItems(chart2, e5, options, useFinalPosition) {
    const position = getRelativePosition2(e5, chart2);
    const items = [];
    const axis = options.axis;
    const rangeMethod = axis === "x" ? "inXRange" : "inYRange";
    let intersectsItem = false;
    evaluateAllVisibleItems(chart2, (element, datasetIndex, index) => {
      if (element[rangeMethod](position[axis], useFinalPosition)) {
        items.push({ element, datasetIndex, index });
      }
      if (element.inRange(position.x, position.y, useFinalPosition)) {
        intersectsItem = true;
      }
    });
    if (options.intersect && !intersectsItem) {
      return [];
    }
    return items;
  }
  var Interaction = {
    modes: {
      index(chart2, e5, options, useFinalPosition) {
        const position = getRelativePosition2(e5, chart2);
        const axis = options.axis || "x";
        const items = options.intersect ? getIntersectItems(chart2, position, axis, useFinalPosition) : getNearestItems(chart2, position, axis, false, useFinalPosition);
        const elements = [];
        if (!items.length) {
          return [];
        }
        chart2.getSortedVisibleDatasetMetas().forEach((meta) => {
          const index = items[0].index;
          const element = meta.data[index];
          if (element && !element.skip) {
            elements.push({ element, datasetIndex: meta.index, index });
          }
        });
        return elements;
      },
      dataset(chart2, e5, options, useFinalPosition) {
        const position = getRelativePosition2(e5, chart2);
        const axis = options.axis || "xy";
        let items = options.intersect ? getIntersectItems(chart2, position, axis, useFinalPosition) : getNearestItems(chart2, position, axis, false, useFinalPosition);
        if (items.length > 0) {
          const datasetIndex = items[0].datasetIndex;
          const data = chart2.getDatasetMeta(datasetIndex).data;
          items = [];
          for (let i4 = 0; i4 < data.length; ++i4) {
            items.push({ element: data[i4], datasetIndex, index: i4 });
          }
        }
        return items;
      },
      point(chart2, e5, options, useFinalPosition) {
        const position = getRelativePosition2(e5, chart2);
        const axis = options.axis || "xy";
        return getIntersectItems(chart2, position, axis, useFinalPosition);
      },
      nearest(chart2, e5, options, useFinalPosition) {
        const position = getRelativePosition2(e5, chart2);
        const axis = options.axis || "xy";
        return getNearestItems(chart2, position, axis, options.intersect, useFinalPosition);
      },
      x(chart2, e5, options, useFinalPosition) {
        return getAxisItems(chart2, e5, { axis: "x", intersect: options.intersect }, useFinalPosition);
      },
      y(chart2, e5, options, useFinalPosition) {
        return getAxisItems(chart2, e5, { axis: "y", intersect: options.intersect }, useFinalPosition);
      }
    }
  };
  var STATIC_POSITIONS = ["left", "top", "right", "bottom"];
  function filterByPosition(array, position) {
    return array.filter((v2) => v2.pos === position);
  }
  function filterDynamicPositionByAxis(array, axis) {
    return array.filter((v2) => STATIC_POSITIONS.indexOf(v2.pos) === -1 && v2.box.axis === axis);
  }
  function sortByWeight(array, reverse) {
    return array.sort((a3, b2) => {
      const v0 = reverse ? b2 : a3;
      const v1 = reverse ? a3 : b2;
      return v0.weight === v1.weight ? v0.index - v1.index : v0.weight - v1.weight;
    });
  }
  function wrapBoxes(boxes) {
    const layoutBoxes = [];
    let i4, ilen, box, pos, stack, stackWeight;
    for (i4 = 0, ilen = (boxes || []).length; i4 < ilen; ++i4) {
      box = boxes[i4];
      ({ position: pos, options: { stack, stackWeight = 1 } } = box);
      layoutBoxes.push({
        index: i4,
        box,
        pos,
        horizontal: box.isHorizontal(),
        weight: box.weight,
        stack: stack && pos + stack,
        stackWeight
      });
    }
    return layoutBoxes;
  }
  function buildStacks(layouts2) {
    const stacks = {};
    for (const wrap of layouts2) {
      const { stack, pos, stackWeight } = wrap;
      if (!stack || !STATIC_POSITIONS.includes(pos)) {
        continue;
      }
      const _stack = stacks[stack] || (stacks[stack] = { count: 0, placed: 0, weight: 0, size: 0 });
      _stack.count++;
      _stack.weight += stackWeight;
    }
    return stacks;
  }
  function setLayoutDims(layouts2, params) {
    const stacks = buildStacks(layouts2);
    const { vBoxMaxWidth, hBoxMaxHeight } = params;
    let i4, ilen, layout;
    for (i4 = 0, ilen = layouts2.length; i4 < ilen; ++i4) {
      layout = layouts2[i4];
      const { fullSize } = layout.box;
      const stack = stacks[layout.stack];
      const factor = stack && layout.stackWeight / stack.weight;
      if (layout.horizontal) {
        layout.width = factor ? factor * vBoxMaxWidth : fullSize && params.availableWidth;
        layout.height = hBoxMaxHeight;
      } else {
        layout.width = vBoxMaxWidth;
        layout.height = factor ? factor * hBoxMaxHeight : fullSize && params.availableHeight;
      }
    }
    return stacks;
  }
  function buildLayoutBoxes(boxes) {
    const layoutBoxes = wrapBoxes(boxes);
    const fullSize = sortByWeight(layoutBoxes.filter((wrap) => wrap.box.fullSize), true);
    const left = sortByWeight(filterByPosition(layoutBoxes, "left"), true);
    const right = sortByWeight(filterByPosition(layoutBoxes, "right"));
    const top = sortByWeight(filterByPosition(layoutBoxes, "top"), true);
    const bottom = sortByWeight(filterByPosition(layoutBoxes, "bottom"));
    const centerHorizontal = filterDynamicPositionByAxis(layoutBoxes, "x");
    const centerVertical = filterDynamicPositionByAxis(layoutBoxes, "y");
    return {
      fullSize,
      leftAndTop: left.concat(top),
      rightAndBottom: right.concat(centerVertical).concat(bottom).concat(centerHorizontal),
      chartArea: filterByPosition(layoutBoxes, "chartArea"),
      vertical: left.concat(right).concat(centerVertical),
      horizontal: top.concat(bottom).concat(centerHorizontal)
    };
  }
  function getCombinedMax(maxPadding, chartArea, a3, b2) {
    return Math.max(maxPadding[a3], chartArea[a3]) + Math.max(maxPadding[b2], chartArea[b2]);
  }
  function updateMaxPadding(maxPadding, boxPadding) {
    maxPadding.top = Math.max(maxPadding.top, boxPadding.top);
    maxPadding.left = Math.max(maxPadding.left, boxPadding.left);
    maxPadding.bottom = Math.max(maxPadding.bottom, boxPadding.bottom);
    maxPadding.right = Math.max(maxPadding.right, boxPadding.right);
  }
  function updateDims(chartArea, params, layout, stacks) {
    const { pos, box } = layout;
    const maxPadding = chartArea.maxPadding;
    if (!isObject(pos)) {
      if (layout.size) {
        chartArea[pos] -= layout.size;
      }
      const stack = stacks[layout.stack] || { size: 0, count: 1 };
      stack.size = Math.max(stack.size, layout.horizontal ? box.height : box.width);
      layout.size = stack.size / stack.count;
      chartArea[pos] += layout.size;
    }
    if (box.getPadding) {
      updateMaxPadding(maxPadding, box.getPadding());
    }
    const newWidth = Math.max(0, params.outerWidth - getCombinedMax(maxPadding, chartArea, "left", "right"));
    const newHeight = Math.max(0, params.outerHeight - getCombinedMax(maxPadding, chartArea, "top", "bottom"));
    const widthChanged = newWidth !== chartArea.w;
    const heightChanged = newHeight !== chartArea.h;
    chartArea.w = newWidth;
    chartArea.h = newHeight;
    return layout.horizontal ? { same: widthChanged, other: heightChanged } : { same: heightChanged, other: widthChanged };
  }
  function handleMaxPadding(chartArea) {
    const maxPadding = chartArea.maxPadding;
    function updatePos(pos) {
      const change = Math.max(maxPadding[pos] - chartArea[pos], 0);
      chartArea[pos] += change;
      return change;
    }
    chartArea.y += updatePos("top");
    chartArea.x += updatePos("left");
    updatePos("right");
    updatePos("bottom");
  }
  function getMargins(horizontal, chartArea) {
    const maxPadding = chartArea.maxPadding;
    function marginForPositions(positions2) {
      const margin = { left: 0, top: 0, right: 0, bottom: 0 };
      positions2.forEach((pos) => {
        margin[pos] = Math.max(chartArea[pos], maxPadding[pos]);
      });
      return margin;
    }
    return horizontal ? marginForPositions(["left", "right"]) : marginForPositions(["top", "bottom"]);
  }
  function fitBoxes(boxes, chartArea, params, stacks) {
    const refitBoxes = [];
    let i4, ilen, layout, box, refit, changed;
    for (i4 = 0, ilen = boxes.length, refit = 0; i4 < ilen; ++i4) {
      layout = boxes[i4];
      box = layout.box;
      box.update(layout.width || chartArea.w, layout.height || chartArea.h, getMargins(layout.horizontal, chartArea));
      const { same, other } = updateDims(chartArea, params, layout, stacks);
      refit |= same && refitBoxes.length;
      changed = changed || other;
      if (!box.fullSize) {
        refitBoxes.push(layout);
      }
    }
    return refit && fitBoxes(refitBoxes, chartArea, params, stacks) || changed;
  }
  function setBoxDims(box, left, top, width, height) {
    box.top = top;
    box.left = left;
    box.right = left + width;
    box.bottom = top + height;
    box.width = width;
    box.height = height;
  }
  function placeBoxes(boxes, chartArea, params, stacks) {
    const userPadding = params.padding;
    let { x: x2, y: y2 } = chartArea;
    for (const layout of boxes) {
      const box = layout.box;
      const stack = stacks[layout.stack] || { count: 1, placed: 0, weight: 1 };
      const weight = layout.stackWeight / stack.weight || 1;
      if (layout.horizontal) {
        const width = chartArea.w * weight;
        const height = stack.size || box.height;
        if (defined(stack.start)) {
          y2 = stack.start;
        }
        if (box.fullSize) {
          setBoxDims(box, userPadding.left, y2, params.outerWidth - userPadding.right - userPadding.left, height);
        } else {
          setBoxDims(box, chartArea.left + stack.placed, y2, width, height);
        }
        stack.start = y2;
        stack.placed += width;
        y2 = box.bottom;
      } else {
        const height = chartArea.h * weight;
        const width = stack.size || box.width;
        if (defined(stack.start)) {
          x2 = stack.start;
        }
        if (box.fullSize) {
          setBoxDims(box, x2, userPadding.top, width, params.outerHeight - userPadding.bottom - userPadding.top);
        } else {
          setBoxDims(box, x2, chartArea.top + stack.placed, width, height);
        }
        stack.start = x2;
        stack.placed += height;
        x2 = box.right;
      }
    }
    chartArea.x = x2;
    chartArea.y = y2;
  }
  defaults.set("layout", {
    autoPadding: true,
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  });
  var layouts = {
    addBox(chart2, item) {
      if (!chart2.boxes) {
        chart2.boxes = [];
      }
      item.fullSize = item.fullSize || false;
      item.position = item.position || "top";
      item.weight = item.weight || 0;
      item._layers = item._layers || function() {
        return [{
          z: 0,
          draw(chartArea) {
            item.draw(chartArea);
          }
        }];
      };
      chart2.boxes.push(item);
    },
    removeBox(chart2, layoutItem) {
      const index = chart2.boxes ? chart2.boxes.indexOf(layoutItem) : -1;
      if (index !== -1) {
        chart2.boxes.splice(index, 1);
      }
    },
    configure(chart2, item, options) {
      item.fullSize = options.fullSize;
      item.position = options.position;
      item.weight = options.weight;
    },
    update(chart2, width, height, minPadding) {
      if (!chart2) {
        return;
      }
      const padding = toPadding(chart2.options.layout.padding);
      const availableWidth = Math.max(width - padding.width, 0);
      const availableHeight = Math.max(height - padding.height, 0);
      const boxes = buildLayoutBoxes(chart2.boxes);
      const verticalBoxes = boxes.vertical;
      const horizontalBoxes = boxes.horizontal;
      each(chart2.boxes, (box) => {
        if (typeof box.beforeLayout === "function") {
          box.beforeLayout();
        }
      });
      const visibleVerticalBoxCount = verticalBoxes.reduce((total, wrap) => wrap.box.options && wrap.box.options.display === false ? total : total + 1, 0) || 1;
      const params = Object.freeze({
        outerWidth: width,
        outerHeight: height,
        padding,
        availableWidth,
        availableHeight,
        vBoxMaxWidth: availableWidth / 2 / visibleVerticalBoxCount,
        hBoxMaxHeight: availableHeight / 2
      });
      const maxPadding = Object.assign({}, padding);
      updateMaxPadding(maxPadding, toPadding(minPadding));
      const chartArea = Object.assign({
        maxPadding,
        w: availableWidth,
        h: availableHeight,
        x: padding.left,
        y: padding.top
      }, padding);
      const stacks = setLayoutDims(verticalBoxes.concat(horizontalBoxes), params);
      fitBoxes(boxes.fullSize, chartArea, params, stacks);
      fitBoxes(verticalBoxes, chartArea, params, stacks);
      if (fitBoxes(horizontalBoxes, chartArea, params, stacks)) {
        fitBoxes(verticalBoxes, chartArea, params, stacks);
      }
      handleMaxPadding(chartArea);
      placeBoxes(boxes.leftAndTop, chartArea, params, stacks);
      chartArea.x += chartArea.w;
      chartArea.y += chartArea.h;
      placeBoxes(boxes.rightAndBottom, chartArea, params, stacks);
      chart2.chartArea = {
        left: chartArea.left,
        top: chartArea.top,
        right: chartArea.left + chartArea.w,
        bottom: chartArea.top + chartArea.h,
        height: chartArea.h,
        width: chartArea.w
      };
      each(boxes.chartArea, (layout) => {
        const box = layout.box;
        Object.assign(box, chart2.chartArea);
        box.update(chartArea.w, chartArea.h, { left: 0, top: 0, right: 0, bottom: 0 });
      });
    }
  };
  var BasePlatform = class {
    acquireContext(canvas, aspectRatio) {
    }
    releaseContext(context) {
      return false;
    }
    addEventListener(chart2, type, listener) {
    }
    removeEventListener(chart2, type, listener) {
    }
    getDevicePixelRatio() {
      return 1;
    }
    getMaximumSize(element, width, height, aspectRatio) {
      width = Math.max(0, width || element.width);
      height = height || element.height;
      return {
        width,
        height: Math.max(0, aspectRatio ? Math.floor(width / aspectRatio) : height)
      };
    }
    isAttached(canvas) {
      return true;
    }
    updateConfig(config) {
    }
  };
  var BasicPlatform = class extends BasePlatform {
    acquireContext(item) {
      return item && item.getContext && item.getContext("2d") || null;
    }
    updateConfig(config) {
      config.options.animation = false;
    }
  };
  var EXPANDO_KEY = "$chartjs";
  var EVENT_TYPES = {
    touchstart: "mousedown",
    touchmove: "mousemove",
    touchend: "mouseup",
    pointerenter: "mouseenter",
    pointerdown: "mousedown",
    pointermove: "mousemove",
    pointerup: "mouseup",
    pointerleave: "mouseout",
    pointerout: "mouseout"
  };
  var isNullOrEmpty = (value) => value === null || value === "";
  function initCanvas(canvas, aspectRatio) {
    const style = canvas.style;
    const renderHeight = canvas.getAttribute("height");
    const renderWidth = canvas.getAttribute("width");
    canvas[EXPANDO_KEY] = {
      initial: {
        height: renderHeight,
        width: renderWidth,
        style: {
          display: style.display,
          height: style.height,
          width: style.width
        }
      }
    };
    style.display = style.display || "block";
    style.boxSizing = style.boxSizing || "border-box";
    if (isNullOrEmpty(renderWidth)) {
      const displayWidth = readUsedSize(canvas, "width");
      if (displayWidth !== void 0) {
        canvas.width = displayWidth;
      }
    }
    if (isNullOrEmpty(renderHeight)) {
      if (canvas.style.height === "") {
        canvas.height = canvas.width / (aspectRatio || 2);
      } else {
        const displayHeight = readUsedSize(canvas, "height");
        if (displayHeight !== void 0) {
          canvas.height = displayHeight;
        }
      }
    }
    return canvas;
  }
  var eventListenerOptions = supportsEventListenerOptions ? { passive: true } : false;
  function addListener(node, type, listener) {
    node.addEventListener(type, listener, eventListenerOptions);
  }
  function removeListener(chart2, type, listener) {
    chart2.canvas.removeEventListener(type, listener, eventListenerOptions);
  }
  function fromNativeEvent(event, chart2) {
    const type = EVENT_TYPES[event.type] || event.type;
    const { x: x2, y: y2 } = getRelativePosition(event, chart2);
    return {
      type,
      chart: chart2,
      native: event,
      x: x2 !== void 0 ? x2 : null,
      y: y2 !== void 0 ? y2 : null
    };
  }
  function nodeListContains(nodeList, canvas) {
    for (const node of nodeList) {
      if (node === canvas || node.contains(canvas)) {
        return true;
      }
    }
  }
  function createAttachObserver(chart2, type, listener) {
    const canvas = chart2.canvas;
    const observer = new MutationObserver((entries) => {
      let trigger = false;
      for (const entry of entries) {
        trigger = trigger || nodeListContains(entry.addedNodes, canvas);
        trigger = trigger && !nodeListContains(entry.removedNodes, canvas);
      }
      if (trigger) {
        listener();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
    return observer;
  }
  function createDetachObserver(chart2, type, listener) {
    const canvas = chart2.canvas;
    const observer = new MutationObserver((entries) => {
      let trigger = false;
      for (const entry of entries) {
        trigger = trigger || nodeListContains(entry.removedNodes, canvas);
        trigger = trigger && !nodeListContains(entry.addedNodes, canvas);
      }
      if (trigger) {
        listener();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
    return observer;
  }
  var drpListeningCharts = /* @__PURE__ */ new Map();
  var oldDevicePixelRatio = 0;
  function onWindowResize() {
    const dpr = window.devicePixelRatio;
    if (dpr === oldDevicePixelRatio) {
      return;
    }
    oldDevicePixelRatio = dpr;
    drpListeningCharts.forEach((resize, chart2) => {
      if (chart2.currentDevicePixelRatio !== dpr) {
        resize();
      }
    });
  }
  function listenDevicePixelRatioChanges(chart2, resize) {
    if (!drpListeningCharts.size) {
      window.addEventListener("resize", onWindowResize);
    }
    drpListeningCharts.set(chart2, resize);
  }
  function unlistenDevicePixelRatioChanges(chart2) {
    drpListeningCharts.delete(chart2);
    if (!drpListeningCharts.size) {
      window.removeEventListener("resize", onWindowResize);
    }
  }
  function createResizeObserver(chart2, type, listener) {
    const canvas = chart2.canvas;
    const container = canvas && _getParentNode(canvas);
    if (!container) {
      return;
    }
    const resize = throttled((width, height) => {
      const w2 = container.clientWidth;
      listener(width, height);
      if (w2 < container.clientWidth) {
        listener();
      }
    }, window);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      if (width === 0 && height === 0) {
        return;
      }
      resize(width, height);
    });
    observer.observe(container);
    listenDevicePixelRatioChanges(chart2, resize);
    return observer;
  }
  function releaseObserver(chart2, type, observer) {
    if (observer) {
      observer.disconnect();
    }
    if (type === "resize") {
      unlistenDevicePixelRatioChanges(chart2);
    }
  }
  function createProxyAndListen(chart2, type, listener) {
    const canvas = chart2.canvas;
    const proxy = throttled((event) => {
      if (chart2.ctx !== null) {
        listener(fromNativeEvent(event, chart2));
      }
    }, chart2, (args) => {
      const event = args[0];
      return [event, event.offsetX, event.offsetY];
    });
    addListener(canvas, type, proxy);
    return proxy;
  }
  var DomPlatform = class extends BasePlatform {
    acquireContext(canvas, aspectRatio) {
      const context = canvas && canvas.getContext && canvas.getContext("2d");
      if (context && context.canvas === canvas) {
        initCanvas(canvas, aspectRatio);
        return context;
      }
      return null;
    }
    releaseContext(context) {
      const canvas = context.canvas;
      if (!canvas[EXPANDO_KEY]) {
        return false;
      }
      const initial = canvas[EXPANDO_KEY].initial;
      ["height", "width"].forEach((prop) => {
        const value = initial[prop];
        if (isNullOrUndef(value)) {
          canvas.removeAttribute(prop);
        } else {
          canvas.setAttribute(prop, value);
        }
      });
      const style = initial.style || {};
      Object.keys(style).forEach((key) => {
        canvas.style[key] = style[key];
      });
      canvas.width = canvas.width;
      delete canvas[EXPANDO_KEY];
      return true;
    }
    addEventListener(chart2, type, listener) {
      this.removeEventListener(chart2, type);
      const proxies = chart2.$proxies || (chart2.$proxies = {});
      const handlers = {
        attach: createAttachObserver,
        detach: createDetachObserver,
        resize: createResizeObserver
      };
      const handler = handlers[type] || createProxyAndListen;
      proxies[type] = handler(chart2, type, listener);
    }
    removeEventListener(chart2, type) {
      const proxies = chart2.$proxies || (chart2.$proxies = {});
      const proxy = proxies[type];
      if (!proxy) {
        return;
      }
      const handlers = {
        attach: releaseObserver,
        detach: releaseObserver,
        resize: releaseObserver
      };
      const handler = handlers[type] || removeListener;
      handler(chart2, type, proxy);
      proxies[type] = void 0;
    }
    getDevicePixelRatio() {
      return window.devicePixelRatio;
    }
    getMaximumSize(canvas, width, height, aspectRatio) {
      return getMaximumSize(canvas, width, height, aspectRatio);
    }
    isAttached(canvas) {
      const container = _getParentNode(canvas);
      return !!(container && container.isConnected);
    }
  };
  function _detectPlatform(canvas) {
    if (!_isDomSupported() || typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas) {
      return BasicPlatform;
    }
    return DomPlatform;
  }
  var Element = class {
    constructor() {
      this.x = void 0;
      this.y = void 0;
      this.active = false;
      this.options = void 0;
      this.$animations = void 0;
    }
    tooltipPosition(useFinalPosition) {
      const { x: x2, y: y2 } = this.getProps(["x", "y"], useFinalPosition);
      return { x: x2, y: y2 };
    }
    hasValue() {
      return isNumber(this.x) && isNumber(this.y);
    }
    getProps(props, final) {
      const anims = this.$animations;
      if (!final || !anims) {
        return this;
      }
      const ret = {};
      props.forEach((prop) => {
        ret[prop] = anims[prop] && anims[prop].active() ? anims[prop]._to : this[prop];
      });
      return ret;
    }
  };
  Element.defaults = {};
  Element.defaultRoutes = void 0;
  var formatters = {
    values(value) {
      return isArray(value) ? value : "" + value;
    },
    numeric(tickValue, index, ticks) {
      if (tickValue === 0) {
        return "0";
      }
      const locale3 = this.chart.options.locale;
      let notation;
      let delta = tickValue;
      if (ticks.length > 1) {
        const maxTick = Math.max(Math.abs(ticks[0].value), Math.abs(ticks[ticks.length - 1].value));
        if (maxTick < 1e-4 || maxTick > 1e15) {
          notation = "scientific";
        }
        delta = calculateDelta(tickValue, ticks);
      }
      const logDelta = log10(Math.abs(delta));
      const numDecimal = Math.max(Math.min(-1 * Math.floor(logDelta), 20), 0);
      const options = { notation, minimumFractionDigits: numDecimal, maximumFractionDigits: numDecimal };
      Object.assign(options, this.options.ticks.format);
      return formatNumber(tickValue, locale3, options);
    },
    logarithmic(tickValue, index, ticks) {
      if (tickValue === 0) {
        return "0";
      }
      const remain = tickValue / Math.pow(10, Math.floor(log10(tickValue)));
      if (remain === 1 || remain === 2 || remain === 5) {
        return formatters.numeric.call(this, tickValue, index, ticks);
      }
      return "";
    }
  };
  function calculateDelta(tickValue, ticks) {
    let delta = ticks.length > 3 ? ticks[2].value - ticks[1].value : ticks[1].value - ticks[0].value;
    if (Math.abs(delta) >= 1 && tickValue !== Math.floor(tickValue)) {
      delta = tickValue - Math.floor(tickValue);
    }
    return delta;
  }
  var Ticks = { formatters };
  defaults.set("scale", {
    display: true,
    offset: false,
    reverse: false,
    beginAtZero: false,
    bounds: "ticks",
    grace: 0,
    grid: {
      display: true,
      lineWidth: 1,
      drawBorder: true,
      drawOnChartArea: true,
      drawTicks: true,
      tickLength: 8,
      tickWidth: (_ctx, options) => options.lineWidth,
      tickColor: (_ctx, options) => options.color,
      offset: false,
      borderDash: [],
      borderDashOffset: 0,
      borderWidth: 1
    },
    title: {
      display: false,
      text: "",
      padding: {
        top: 4,
        bottom: 4
      }
    },
    ticks: {
      minRotation: 0,
      maxRotation: 50,
      mirror: false,
      textStrokeWidth: 0,
      textStrokeColor: "",
      padding: 3,
      display: true,
      autoSkip: true,
      autoSkipPadding: 3,
      labelOffset: 0,
      callback: Ticks.formatters.values,
      minor: {},
      major: {},
      align: "center",
      crossAlign: "near",
      showLabelBackdrop: false,
      backdropColor: "rgba(255, 255, 255, 0.75)",
      backdropPadding: 2
    }
  });
  defaults.route("scale.ticks", "color", "", "color");
  defaults.route("scale.grid", "color", "", "borderColor");
  defaults.route("scale.grid", "borderColor", "", "borderColor");
  defaults.route("scale.title", "color", "", "color");
  defaults.describe("scale", {
    _fallback: false,
    _scriptable: (name) => !name.startsWith("before") && !name.startsWith("after") && name !== "callback" && name !== "parser",
    _indexable: (name) => name !== "borderDash" && name !== "tickBorderDash"
  });
  defaults.describe("scales", {
    _fallback: "scale"
  });
  defaults.describe("scale.ticks", {
    _scriptable: (name) => name !== "backdropPadding" && name !== "callback",
    _indexable: (name) => name !== "backdropPadding"
  });
  function autoSkip(scale, ticks) {
    const tickOpts = scale.options.ticks;
    const ticksLimit = tickOpts.maxTicksLimit || determineMaxTicks(scale);
    const majorIndices = tickOpts.major.enabled ? getMajorIndices(ticks) : [];
    const numMajorIndices = majorIndices.length;
    const first = majorIndices[0];
    const last = majorIndices[numMajorIndices - 1];
    const newTicks = [];
    if (numMajorIndices > ticksLimit) {
      skipMajors(ticks, newTicks, majorIndices, numMajorIndices / ticksLimit);
      return newTicks;
    }
    const spacing = calculateSpacing(majorIndices, ticks, ticksLimit);
    if (numMajorIndices > 0) {
      let i4, ilen;
      const avgMajorSpacing = numMajorIndices > 1 ? Math.round((last - first) / (numMajorIndices - 1)) : null;
      skip(ticks, newTicks, spacing, isNullOrUndef(avgMajorSpacing) ? 0 : first - avgMajorSpacing, first);
      for (i4 = 0, ilen = numMajorIndices - 1; i4 < ilen; i4++) {
        skip(ticks, newTicks, spacing, majorIndices[i4], majorIndices[i4 + 1]);
      }
      skip(ticks, newTicks, spacing, last, isNullOrUndef(avgMajorSpacing) ? ticks.length : last + avgMajorSpacing);
      return newTicks;
    }
    skip(ticks, newTicks, spacing);
    return newTicks;
  }
  function determineMaxTicks(scale) {
    const offset = scale.options.offset;
    const tickLength = scale._tickSize();
    const maxScale = scale._length / tickLength + (offset ? 0 : 1);
    const maxChart = scale._maxLength / tickLength;
    return Math.floor(Math.min(maxScale, maxChart));
  }
  function calculateSpacing(majorIndices, ticks, ticksLimit) {
    const evenMajorSpacing = getEvenSpacing(majorIndices);
    const spacing = ticks.length / ticksLimit;
    if (!evenMajorSpacing) {
      return Math.max(spacing, 1);
    }
    const factors = _factorize(evenMajorSpacing);
    for (let i4 = 0, ilen = factors.length - 1; i4 < ilen; i4++) {
      const factor = factors[i4];
      if (factor > spacing) {
        return factor;
      }
    }
    return Math.max(spacing, 1);
  }
  function getMajorIndices(ticks) {
    const result = [];
    let i4, ilen;
    for (i4 = 0, ilen = ticks.length; i4 < ilen; i4++) {
      if (ticks[i4].major) {
        result.push(i4);
      }
    }
    return result;
  }
  function skipMajors(ticks, newTicks, majorIndices, spacing) {
    let count = 0;
    let next = majorIndices[0];
    let i4;
    spacing = Math.ceil(spacing);
    for (i4 = 0; i4 < ticks.length; i4++) {
      if (i4 === next) {
        newTicks.push(ticks[i4]);
        count++;
        next = majorIndices[count * spacing];
      }
    }
  }
  function skip(ticks, newTicks, spacing, majorStart, majorEnd) {
    const start = valueOrDefault(majorStart, 0);
    const end = Math.min(valueOrDefault(majorEnd, ticks.length), ticks.length);
    let count = 0;
    let length, i4, next;
    spacing = Math.ceil(spacing);
    if (majorEnd) {
      length = majorEnd - majorStart;
      spacing = length / Math.floor(length / spacing);
    }
    next = start;
    while (next < 0) {
      count++;
      next = Math.round(start + count * spacing);
    }
    for (i4 = Math.max(start, 0); i4 < end; i4++) {
      if (i4 === next) {
        newTicks.push(ticks[i4]);
        count++;
        next = Math.round(start + count * spacing);
      }
    }
  }
  function getEvenSpacing(arr) {
    const len = arr.length;
    let i4, diff;
    if (len < 2) {
      return false;
    }
    for (diff = arr[0], i4 = 1; i4 < len; ++i4) {
      if (arr[i4] - arr[i4 - 1] !== diff) {
        return false;
      }
    }
    return diff;
  }
  var reverseAlign = (align) => align === "left" ? "right" : align === "right" ? "left" : align;
  var offsetFromEdge = (scale, edge, offset) => edge === "top" || edge === "left" ? scale[edge] + offset : scale[edge] - offset;
  function sample(arr, numItems) {
    const result = [];
    const increment = arr.length / numItems;
    const len = arr.length;
    let i4 = 0;
    for (; i4 < len; i4 += increment) {
      result.push(arr[Math.floor(i4)]);
    }
    return result;
  }
  function getPixelForGridLine(scale, index, offsetGridLines) {
    const length = scale.ticks.length;
    const validIndex2 = Math.min(index, length - 1);
    const start = scale._startPixel;
    const end = scale._endPixel;
    const epsilon = 1e-6;
    let lineValue = scale.getPixelForTick(validIndex2);
    let offset;
    if (offsetGridLines) {
      if (length === 1) {
        offset = Math.max(lineValue - start, end - lineValue);
      } else if (index === 0) {
        offset = (scale.getPixelForTick(1) - lineValue) / 2;
      } else {
        offset = (lineValue - scale.getPixelForTick(validIndex2 - 1)) / 2;
      }
      lineValue += validIndex2 < index ? offset : -offset;
      if (lineValue < start - epsilon || lineValue > end + epsilon) {
        return;
      }
    }
    return lineValue;
  }
  function garbageCollect(caches, length) {
    each(caches, (cache) => {
      const gc = cache.gc;
      const gcLen = gc.length / 2;
      let i4;
      if (gcLen > length) {
        for (i4 = 0; i4 < gcLen; ++i4) {
          delete cache.data[gc[i4]];
        }
        gc.splice(0, gcLen);
      }
    });
  }
  function getTickMarkLength(options) {
    return options.drawTicks ? options.tickLength : 0;
  }
  function getTitleHeight(options, fallback) {
    if (!options.display) {
      return 0;
    }
    const font = toFont(options.font, fallback);
    const padding = toPadding(options.padding);
    const lines = isArray(options.text) ? options.text.length : 1;
    return lines * font.lineHeight + padding.height;
  }
  function createScaleContext(parent, scale) {
    return createContext(parent, {
      scale,
      type: "scale"
    });
  }
  function createTickContext(parent, index, tick) {
    return createContext(parent, {
      tick,
      index,
      type: "tick"
    });
  }
  function titleAlign(align, position, reverse) {
    let ret = _toLeftRightCenter(align);
    if (reverse && position !== "right" || !reverse && position === "right") {
      ret = reverseAlign(ret);
    }
    return ret;
  }
  function titleArgs(scale, offset, position, align) {
    const { top, left, bottom, right, chart: chart2 } = scale;
    const { chartArea, scales } = chart2;
    let rotation = 0;
    let maxWidth, titleX, titleY;
    const height = bottom - top;
    const width = right - left;
    if (scale.isHorizontal()) {
      titleX = _alignStartEnd(align, left, right);
      if (isObject(position)) {
        const positionAxisID = Object.keys(position)[0];
        const value = position[positionAxisID];
        titleY = scales[positionAxisID].getPixelForValue(value) + height - offset;
      } else if (position === "center") {
        titleY = (chartArea.bottom + chartArea.top) / 2 + height - offset;
      } else {
        titleY = offsetFromEdge(scale, position, offset);
      }
      maxWidth = right - left;
    } else {
      if (isObject(position)) {
        const positionAxisID = Object.keys(position)[0];
        const value = position[positionAxisID];
        titleX = scales[positionAxisID].getPixelForValue(value) - width + offset;
      } else if (position === "center") {
        titleX = (chartArea.left + chartArea.right) / 2 - width + offset;
      } else {
        titleX = offsetFromEdge(scale, position, offset);
      }
      titleY = _alignStartEnd(align, bottom, top);
      rotation = position === "left" ? -HALF_PI : HALF_PI;
    }
    return { titleX, titleY, maxWidth, rotation };
  }
  var Scale = class extends Element {
    constructor(cfg) {
      super();
      this.id = cfg.id;
      this.type = cfg.type;
      this.options = void 0;
      this.ctx = cfg.ctx;
      this.chart = cfg.chart;
      this.top = void 0;
      this.bottom = void 0;
      this.left = void 0;
      this.right = void 0;
      this.width = void 0;
      this.height = void 0;
      this._margins = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      };
      this.maxWidth = void 0;
      this.maxHeight = void 0;
      this.paddingTop = void 0;
      this.paddingBottom = void 0;
      this.paddingLeft = void 0;
      this.paddingRight = void 0;
      this.axis = void 0;
      this.labelRotation = void 0;
      this.min = void 0;
      this.max = void 0;
      this._range = void 0;
      this.ticks = [];
      this._gridLineItems = null;
      this._labelItems = null;
      this._labelSizes = null;
      this._length = 0;
      this._maxLength = 0;
      this._longestTextCache = {};
      this._startPixel = void 0;
      this._endPixel = void 0;
      this._reversePixels = false;
      this._userMax = void 0;
      this._userMin = void 0;
      this._suggestedMax = void 0;
      this._suggestedMin = void 0;
      this._ticksLength = 0;
      this._borderValue = 0;
      this._cache = {};
      this._dataLimitsCached = false;
      this.$context = void 0;
    }
    init(options) {
      this.options = options.setContext(this.getContext());
      this.axis = options.axis;
      this._userMin = this.parse(options.min);
      this._userMax = this.parse(options.max);
      this._suggestedMin = this.parse(options.suggestedMin);
      this._suggestedMax = this.parse(options.suggestedMax);
    }
    parse(raw, index) {
      return raw;
    }
    getUserBounds() {
      let { _userMin, _userMax, _suggestedMin, _suggestedMax } = this;
      _userMin = finiteOrDefault(_userMin, Number.POSITIVE_INFINITY);
      _userMax = finiteOrDefault(_userMax, Number.NEGATIVE_INFINITY);
      _suggestedMin = finiteOrDefault(_suggestedMin, Number.POSITIVE_INFINITY);
      _suggestedMax = finiteOrDefault(_suggestedMax, Number.NEGATIVE_INFINITY);
      return {
        min: finiteOrDefault(_userMin, _suggestedMin),
        max: finiteOrDefault(_userMax, _suggestedMax),
        minDefined: isNumberFinite(_userMin),
        maxDefined: isNumberFinite(_userMax)
      };
    }
    getMinMax(canStack) {
      let { min, max, minDefined, maxDefined } = this.getUserBounds();
      let range;
      if (minDefined && maxDefined) {
        return { min, max };
      }
      const metas = this.getMatchingVisibleMetas();
      for (let i4 = 0, ilen = metas.length; i4 < ilen; ++i4) {
        range = metas[i4].controller.getMinMax(this, canStack);
        if (!minDefined) {
          min = Math.min(min, range.min);
        }
        if (!maxDefined) {
          max = Math.max(max, range.max);
        }
      }
      min = maxDefined && min > max ? max : min;
      max = minDefined && min > max ? min : max;
      return {
        min: finiteOrDefault(min, finiteOrDefault(max, min)),
        max: finiteOrDefault(max, finiteOrDefault(min, max))
      };
    }
    getPadding() {
      return {
        left: this.paddingLeft || 0,
        top: this.paddingTop || 0,
        right: this.paddingRight || 0,
        bottom: this.paddingBottom || 0
      };
    }
    getTicks() {
      return this.ticks;
    }
    getLabels() {
      const data = this.chart.data;
      return this.options.labels || (this.isHorizontal() ? data.xLabels : data.yLabels) || data.labels || [];
    }
    beforeLayout() {
      this._cache = {};
      this._dataLimitsCached = false;
    }
    beforeUpdate() {
      callback(this.options.beforeUpdate, [this]);
    }
    update(maxWidth, maxHeight, margins) {
      const { beginAtZero, grace, ticks: tickOpts } = this.options;
      const sampleSize = tickOpts.sampleSize;
      this.beforeUpdate();
      this.maxWidth = maxWidth;
      this.maxHeight = maxHeight;
      this._margins = margins = Object.assign({
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      }, margins);
      this.ticks = null;
      this._labelSizes = null;
      this._gridLineItems = null;
      this._labelItems = null;
      this.beforeSetDimensions();
      this.setDimensions();
      this.afterSetDimensions();
      this._maxLength = this.isHorizontal() ? this.width + margins.left + margins.right : this.height + margins.top + margins.bottom;
      if (!this._dataLimitsCached) {
        this.beforeDataLimits();
        this.determineDataLimits();
        this.afterDataLimits();
        this._range = _addGrace(this, grace, beginAtZero);
        this._dataLimitsCached = true;
      }
      this.beforeBuildTicks();
      this.ticks = this.buildTicks() || [];
      this.afterBuildTicks();
      const samplingEnabled = sampleSize < this.ticks.length;
      this._convertTicksToLabels(samplingEnabled ? sample(this.ticks, sampleSize) : this.ticks);
      this.configure();
      this.beforeCalculateLabelRotation();
      this.calculateLabelRotation();
      this.afterCalculateLabelRotation();
      if (tickOpts.display && (tickOpts.autoSkip || tickOpts.source === "auto")) {
        this.ticks = autoSkip(this, this.ticks);
        this._labelSizes = null;
      }
      if (samplingEnabled) {
        this._convertTicksToLabels(this.ticks);
      }
      this.beforeFit();
      this.fit();
      this.afterFit();
      this.afterUpdate();
    }
    configure() {
      let reversePixels = this.options.reverse;
      let startPixel, endPixel;
      if (this.isHorizontal()) {
        startPixel = this.left;
        endPixel = this.right;
      } else {
        startPixel = this.top;
        endPixel = this.bottom;
        reversePixels = !reversePixels;
      }
      this._startPixel = startPixel;
      this._endPixel = endPixel;
      this._reversePixels = reversePixels;
      this._length = endPixel - startPixel;
      this._alignToPixels = this.options.alignToPixels;
    }
    afterUpdate() {
      callback(this.options.afterUpdate, [this]);
    }
    beforeSetDimensions() {
      callback(this.options.beforeSetDimensions, [this]);
    }
    setDimensions() {
      if (this.isHorizontal()) {
        this.width = this.maxWidth;
        this.left = 0;
        this.right = this.width;
      } else {
        this.height = this.maxHeight;
        this.top = 0;
        this.bottom = this.height;
      }
      this.paddingLeft = 0;
      this.paddingTop = 0;
      this.paddingRight = 0;
      this.paddingBottom = 0;
    }
    afterSetDimensions() {
      callback(this.options.afterSetDimensions, [this]);
    }
    _callHooks(name) {
      this.chart.notifyPlugins(name, this.getContext());
      callback(this.options[name], [this]);
    }
    beforeDataLimits() {
      this._callHooks("beforeDataLimits");
    }
    determineDataLimits() {
    }
    afterDataLimits() {
      this._callHooks("afterDataLimits");
    }
    beforeBuildTicks() {
      this._callHooks("beforeBuildTicks");
    }
    buildTicks() {
      return [];
    }
    afterBuildTicks() {
      this._callHooks("afterBuildTicks");
    }
    beforeTickToLabelConversion() {
      callback(this.options.beforeTickToLabelConversion, [this]);
    }
    generateTickLabels(ticks) {
      const tickOpts = this.options.ticks;
      let i4, ilen, tick;
      for (i4 = 0, ilen = ticks.length; i4 < ilen; i4++) {
        tick = ticks[i4];
        tick.label = callback(tickOpts.callback, [tick.value, i4, ticks], this);
      }
    }
    afterTickToLabelConversion() {
      callback(this.options.afterTickToLabelConversion, [this]);
    }
    beforeCalculateLabelRotation() {
      callback(this.options.beforeCalculateLabelRotation, [this]);
    }
    calculateLabelRotation() {
      const options = this.options;
      const tickOpts = options.ticks;
      const numTicks = this.ticks.length;
      const minRotation = tickOpts.minRotation || 0;
      const maxRotation = tickOpts.maxRotation;
      let labelRotation = minRotation;
      let tickWidth, maxHeight, maxLabelDiagonal;
      if (!this._isVisible() || !tickOpts.display || minRotation >= maxRotation || numTicks <= 1 || !this.isHorizontal()) {
        this.labelRotation = minRotation;
        return;
      }
      const labelSizes = this._getLabelSizes();
      const maxLabelWidth = labelSizes.widest.width;
      const maxLabelHeight = labelSizes.highest.height;
      const maxWidth = _limitValue(this.chart.width - maxLabelWidth, 0, this.maxWidth);
      tickWidth = options.offset ? this.maxWidth / numTicks : maxWidth / (numTicks - 1);
      if (maxLabelWidth + 6 > tickWidth) {
        tickWidth = maxWidth / (numTicks - (options.offset ? 0.5 : 1));
        maxHeight = this.maxHeight - getTickMarkLength(options.grid) - tickOpts.padding - getTitleHeight(options.title, this.chart.options.font);
        maxLabelDiagonal = Math.sqrt(maxLabelWidth * maxLabelWidth + maxLabelHeight * maxLabelHeight);
        labelRotation = toDegrees(Math.min(Math.asin(_limitValue((labelSizes.highest.height + 6) / tickWidth, -1, 1)), Math.asin(_limitValue(maxHeight / maxLabelDiagonal, -1, 1)) - Math.asin(_limitValue(maxLabelHeight / maxLabelDiagonal, -1, 1))));
        labelRotation = Math.max(minRotation, Math.min(maxRotation, labelRotation));
      }
      this.labelRotation = labelRotation;
    }
    afterCalculateLabelRotation() {
      callback(this.options.afterCalculateLabelRotation, [this]);
    }
    beforeFit() {
      callback(this.options.beforeFit, [this]);
    }
    fit() {
      const minSize = {
        width: 0,
        height: 0
      };
      const { chart: chart2, options: { ticks: tickOpts, title: titleOpts, grid: gridOpts } } = this;
      const display = this._isVisible();
      const isHorizontal = this.isHorizontal();
      if (display) {
        const titleHeight = getTitleHeight(titleOpts, chart2.options.font);
        if (isHorizontal) {
          minSize.width = this.maxWidth;
          minSize.height = getTickMarkLength(gridOpts) + titleHeight;
        } else {
          minSize.height = this.maxHeight;
          minSize.width = getTickMarkLength(gridOpts) + titleHeight;
        }
        if (tickOpts.display && this.ticks.length) {
          const { first, last, widest, highest } = this._getLabelSizes();
          const tickPadding = tickOpts.padding * 2;
          const angleRadians = toRadians(this.labelRotation);
          const cos = Math.cos(angleRadians);
          const sin = Math.sin(angleRadians);
          if (isHorizontal) {
            const labelHeight = tickOpts.mirror ? 0 : sin * widest.width + cos * highest.height;
            minSize.height = Math.min(this.maxHeight, minSize.height + labelHeight + tickPadding);
          } else {
            const labelWidth = tickOpts.mirror ? 0 : cos * widest.width + sin * highest.height;
            minSize.width = Math.min(this.maxWidth, minSize.width + labelWidth + tickPadding);
          }
          this._calculatePadding(first, last, sin, cos);
        }
      }
      this._handleMargins();
      if (isHorizontal) {
        this.width = this._length = chart2.width - this._margins.left - this._margins.right;
        this.height = minSize.height;
      } else {
        this.width = minSize.width;
        this.height = this._length = chart2.height - this._margins.top - this._margins.bottom;
      }
    }
    _calculatePadding(first, last, sin, cos) {
      const { ticks: { align, padding }, position } = this.options;
      const isRotated = this.labelRotation !== 0;
      const labelsBelowTicks = position !== "top" && this.axis === "x";
      if (this.isHorizontal()) {
        const offsetLeft = this.getPixelForTick(0) - this.left;
        const offsetRight = this.right - this.getPixelForTick(this.ticks.length - 1);
        let paddingLeft = 0;
        let paddingRight = 0;
        if (isRotated) {
          if (labelsBelowTicks) {
            paddingLeft = cos * first.width;
            paddingRight = sin * last.height;
          } else {
            paddingLeft = sin * first.height;
            paddingRight = cos * last.width;
          }
        } else if (align === "start") {
          paddingRight = last.width;
        } else if (align === "end") {
          paddingLeft = first.width;
        } else {
          paddingLeft = first.width / 2;
          paddingRight = last.width / 2;
        }
        this.paddingLeft = Math.max((paddingLeft - offsetLeft + padding) * this.width / (this.width - offsetLeft), 0);
        this.paddingRight = Math.max((paddingRight - offsetRight + padding) * this.width / (this.width - offsetRight), 0);
      } else {
        let paddingTop = last.height / 2;
        let paddingBottom = first.height / 2;
        if (align === "start") {
          paddingTop = 0;
          paddingBottom = first.height;
        } else if (align === "end") {
          paddingTop = last.height;
          paddingBottom = 0;
        }
        this.paddingTop = paddingTop + padding;
        this.paddingBottom = paddingBottom + padding;
      }
    }
    _handleMargins() {
      if (this._margins) {
        this._margins.left = Math.max(this.paddingLeft, this._margins.left);
        this._margins.top = Math.max(this.paddingTop, this._margins.top);
        this._margins.right = Math.max(this.paddingRight, this._margins.right);
        this._margins.bottom = Math.max(this.paddingBottom, this._margins.bottom);
      }
    }
    afterFit() {
      callback(this.options.afterFit, [this]);
    }
    isHorizontal() {
      const { axis, position } = this.options;
      return position === "top" || position === "bottom" || axis === "x";
    }
    isFullSize() {
      return this.options.fullSize;
    }
    _convertTicksToLabels(ticks) {
      this.beforeTickToLabelConversion();
      this.generateTickLabels(ticks);
      let i4, ilen;
      for (i4 = 0, ilen = ticks.length; i4 < ilen; i4++) {
        if (isNullOrUndef(ticks[i4].label)) {
          ticks.splice(i4, 1);
          ilen--;
          i4--;
        }
      }
      this.afterTickToLabelConversion();
    }
    _getLabelSizes() {
      let labelSizes = this._labelSizes;
      if (!labelSizes) {
        const sampleSize = this.options.ticks.sampleSize;
        let ticks = this.ticks;
        if (sampleSize < ticks.length) {
          ticks = sample(ticks, sampleSize);
        }
        this._labelSizes = labelSizes = this._computeLabelSizes(ticks, ticks.length);
      }
      return labelSizes;
    }
    _computeLabelSizes(ticks, length) {
      const { ctx, _longestTextCache: caches } = this;
      const widths = [];
      const heights = [];
      let widestLabelSize = 0;
      let highestLabelSize = 0;
      let i4, j, jlen, label, tickFont, fontString, cache, lineHeight, width, height, nestedLabel;
      for (i4 = 0; i4 < length; ++i4) {
        label = ticks[i4].label;
        tickFont = this._resolveTickFontOptions(i4);
        ctx.font = fontString = tickFont.string;
        cache = caches[fontString] = caches[fontString] || { data: {}, gc: [] };
        lineHeight = tickFont.lineHeight;
        width = height = 0;
        if (!isNullOrUndef(label) && !isArray(label)) {
          width = _measureText(ctx, cache.data, cache.gc, width, label);
          height = lineHeight;
        } else if (isArray(label)) {
          for (j = 0, jlen = label.length; j < jlen; ++j) {
            nestedLabel = label[j];
            if (!isNullOrUndef(nestedLabel) && !isArray(nestedLabel)) {
              width = _measureText(ctx, cache.data, cache.gc, width, nestedLabel);
              height += lineHeight;
            }
          }
        }
        widths.push(width);
        heights.push(height);
        widestLabelSize = Math.max(width, widestLabelSize);
        highestLabelSize = Math.max(height, highestLabelSize);
      }
      garbageCollect(caches, length);
      const widest = widths.indexOf(widestLabelSize);
      const highest = heights.indexOf(highestLabelSize);
      const valueAt = (idx) => ({ width: widths[idx] || 0, height: heights[idx] || 0 });
      return {
        first: valueAt(0),
        last: valueAt(length - 1),
        widest: valueAt(widest),
        highest: valueAt(highest),
        widths,
        heights
      };
    }
    getLabelForValue(value) {
      return value;
    }
    getPixelForValue(value, index) {
      return NaN;
    }
    getValueForPixel(pixel) {
    }
    getPixelForTick(index) {
      const ticks = this.ticks;
      if (index < 0 || index > ticks.length - 1) {
        return null;
      }
      return this.getPixelForValue(ticks[index].value);
    }
    getPixelForDecimal(decimal) {
      if (this._reversePixels) {
        decimal = 1 - decimal;
      }
      const pixel = this._startPixel + decimal * this._length;
      return _int16Range(this._alignToPixels ? _alignPixel(this.chart, pixel, 0) : pixel);
    }
    getDecimalForPixel(pixel) {
      const decimal = (pixel - this._startPixel) / this._length;
      return this._reversePixels ? 1 - decimal : decimal;
    }
    getBasePixel() {
      return this.getPixelForValue(this.getBaseValue());
    }
    getBaseValue() {
      const { min, max } = this;
      return min < 0 && max < 0 ? max : min > 0 && max > 0 ? min : 0;
    }
    getContext(index) {
      const ticks = this.ticks || [];
      if (index >= 0 && index < ticks.length) {
        const tick = ticks[index];
        return tick.$context || (tick.$context = createTickContext(this.getContext(), index, tick));
      }
      return this.$context || (this.$context = createScaleContext(this.chart.getContext(), this));
    }
    _tickSize() {
      const optionTicks = this.options.ticks;
      const rot = toRadians(this.labelRotation);
      const cos = Math.abs(Math.cos(rot));
      const sin = Math.abs(Math.sin(rot));
      const labelSizes = this._getLabelSizes();
      const padding = optionTicks.autoSkipPadding || 0;
      const w2 = labelSizes ? labelSizes.widest.width + padding : 0;
      const h3 = labelSizes ? labelSizes.highest.height + padding : 0;
      return this.isHorizontal() ? h3 * cos > w2 * sin ? w2 / cos : h3 / sin : h3 * sin < w2 * cos ? h3 / cos : w2 / sin;
    }
    _isVisible() {
      const display = this.options.display;
      if (display !== "auto") {
        return !!display;
      }
      return this.getMatchingVisibleMetas().length > 0;
    }
    _computeGridLineItems(chartArea) {
      const axis = this.axis;
      const chart2 = this.chart;
      const options = this.options;
      const { grid, position } = options;
      const offset = grid.offset;
      const isHorizontal = this.isHorizontal();
      const ticks = this.ticks;
      const ticksLength = ticks.length + (offset ? 1 : 0);
      const tl = getTickMarkLength(grid);
      const items = [];
      const borderOpts = grid.setContext(this.getContext());
      const axisWidth = borderOpts.drawBorder ? borderOpts.borderWidth : 0;
      const axisHalfWidth = axisWidth / 2;
      const alignBorderValue = function(pixel) {
        return _alignPixel(chart2, pixel, axisWidth);
      };
      let borderValue, i4, lineValue, alignedLineValue;
      let tx1, ty1, tx2, ty2, x1, y1, x2, y2;
      if (position === "top") {
        borderValue = alignBorderValue(this.bottom);
        ty1 = this.bottom - tl;
        ty2 = borderValue - axisHalfWidth;
        y1 = alignBorderValue(chartArea.top) + axisHalfWidth;
        y2 = chartArea.bottom;
      } else if (position === "bottom") {
        borderValue = alignBorderValue(this.top);
        y1 = chartArea.top;
        y2 = alignBorderValue(chartArea.bottom) - axisHalfWidth;
        ty1 = borderValue + axisHalfWidth;
        ty2 = this.top + tl;
      } else if (position === "left") {
        borderValue = alignBorderValue(this.right);
        tx1 = this.right - tl;
        tx2 = borderValue - axisHalfWidth;
        x1 = alignBorderValue(chartArea.left) + axisHalfWidth;
        x2 = chartArea.right;
      } else if (position === "right") {
        borderValue = alignBorderValue(this.left);
        x1 = chartArea.left;
        x2 = alignBorderValue(chartArea.right) - axisHalfWidth;
        tx1 = borderValue + axisHalfWidth;
        tx2 = this.left + tl;
      } else if (axis === "x") {
        if (position === "center") {
          borderValue = alignBorderValue((chartArea.top + chartArea.bottom) / 2 + 0.5);
        } else if (isObject(position)) {
          const positionAxisID = Object.keys(position)[0];
          const value = position[positionAxisID];
          borderValue = alignBorderValue(this.chart.scales[positionAxisID].getPixelForValue(value));
        }
        y1 = chartArea.top;
        y2 = chartArea.bottom;
        ty1 = borderValue + axisHalfWidth;
        ty2 = ty1 + tl;
      } else if (axis === "y") {
        if (position === "center") {
          borderValue = alignBorderValue((chartArea.left + chartArea.right) / 2);
        } else if (isObject(position)) {
          const positionAxisID = Object.keys(position)[0];
          const value = position[positionAxisID];
          borderValue = alignBorderValue(this.chart.scales[positionAxisID].getPixelForValue(value));
        }
        tx1 = borderValue - axisHalfWidth;
        tx2 = tx1 - tl;
        x1 = chartArea.left;
        x2 = chartArea.right;
      }
      const limit = valueOrDefault(options.ticks.maxTicksLimit, ticksLength);
      const step = Math.max(1, Math.ceil(ticksLength / limit));
      for (i4 = 0; i4 < ticksLength; i4 += step) {
        const optsAtIndex = grid.setContext(this.getContext(i4));
        const lineWidth = optsAtIndex.lineWidth;
        const lineColor = optsAtIndex.color;
        const borderDash = grid.borderDash || [];
        const borderDashOffset = optsAtIndex.borderDashOffset;
        const tickWidth = optsAtIndex.tickWidth;
        const tickColor = optsAtIndex.tickColor;
        const tickBorderDash = optsAtIndex.tickBorderDash || [];
        const tickBorderDashOffset = optsAtIndex.tickBorderDashOffset;
        lineValue = getPixelForGridLine(this, i4, offset);
        if (lineValue === void 0) {
          continue;
        }
        alignedLineValue = _alignPixel(chart2, lineValue, lineWidth);
        if (isHorizontal) {
          tx1 = tx2 = x1 = x2 = alignedLineValue;
        } else {
          ty1 = ty2 = y1 = y2 = alignedLineValue;
        }
        items.push({
          tx1,
          ty1,
          tx2,
          ty2,
          x1,
          y1,
          x2,
          y2,
          width: lineWidth,
          color: lineColor,
          borderDash,
          borderDashOffset,
          tickWidth,
          tickColor,
          tickBorderDash,
          tickBorderDashOffset
        });
      }
      this._ticksLength = ticksLength;
      this._borderValue = borderValue;
      return items;
    }
    _computeLabelItems(chartArea) {
      const axis = this.axis;
      const options = this.options;
      const { position, ticks: optionTicks } = options;
      const isHorizontal = this.isHorizontal();
      const ticks = this.ticks;
      const { align, crossAlign, padding, mirror } = optionTicks;
      const tl = getTickMarkLength(options.grid);
      const tickAndPadding = tl + padding;
      const hTickAndPadding = mirror ? -padding : tickAndPadding;
      const rotation = -toRadians(this.labelRotation);
      const items = [];
      let i4, ilen, tick, label, x2, y2, textAlign, pixel, font, lineHeight, lineCount, textOffset;
      let textBaseline = "middle";
      if (position === "top") {
        y2 = this.bottom - hTickAndPadding;
        textAlign = this._getXAxisLabelAlignment();
      } else if (position === "bottom") {
        y2 = this.top + hTickAndPadding;
        textAlign = this._getXAxisLabelAlignment();
      } else if (position === "left") {
        const ret = this._getYAxisLabelAlignment(tl);
        textAlign = ret.textAlign;
        x2 = ret.x;
      } else if (position === "right") {
        const ret = this._getYAxisLabelAlignment(tl);
        textAlign = ret.textAlign;
        x2 = ret.x;
      } else if (axis === "x") {
        if (position === "center") {
          y2 = (chartArea.top + chartArea.bottom) / 2 + tickAndPadding;
        } else if (isObject(position)) {
          const positionAxisID = Object.keys(position)[0];
          const value = position[positionAxisID];
          y2 = this.chart.scales[positionAxisID].getPixelForValue(value) + tickAndPadding;
        }
        textAlign = this._getXAxisLabelAlignment();
      } else if (axis === "y") {
        if (position === "center") {
          x2 = (chartArea.left + chartArea.right) / 2 - tickAndPadding;
        } else if (isObject(position)) {
          const positionAxisID = Object.keys(position)[0];
          const value = position[positionAxisID];
          x2 = this.chart.scales[positionAxisID].getPixelForValue(value);
        }
        textAlign = this._getYAxisLabelAlignment(tl).textAlign;
      }
      if (axis === "y") {
        if (align === "start") {
          textBaseline = "top";
        } else if (align === "end") {
          textBaseline = "bottom";
        }
      }
      const labelSizes = this._getLabelSizes();
      for (i4 = 0, ilen = ticks.length; i4 < ilen; ++i4) {
        tick = ticks[i4];
        label = tick.label;
        const optsAtIndex = optionTicks.setContext(this.getContext(i4));
        pixel = this.getPixelForTick(i4) + optionTicks.labelOffset;
        font = this._resolveTickFontOptions(i4);
        lineHeight = font.lineHeight;
        lineCount = isArray(label) ? label.length : 1;
        const halfCount = lineCount / 2;
        const color2 = optsAtIndex.color;
        const strokeColor = optsAtIndex.textStrokeColor;
        const strokeWidth = optsAtIndex.textStrokeWidth;
        if (isHorizontal) {
          x2 = pixel;
          if (position === "top") {
            if (crossAlign === "near" || rotation !== 0) {
              textOffset = -lineCount * lineHeight + lineHeight / 2;
            } else if (crossAlign === "center") {
              textOffset = -labelSizes.highest.height / 2 - halfCount * lineHeight + lineHeight;
            } else {
              textOffset = -labelSizes.highest.height + lineHeight / 2;
            }
          } else {
            if (crossAlign === "near" || rotation !== 0) {
              textOffset = lineHeight / 2;
            } else if (crossAlign === "center") {
              textOffset = labelSizes.highest.height / 2 - halfCount * lineHeight;
            } else {
              textOffset = labelSizes.highest.height - lineCount * lineHeight;
            }
          }
          if (mirror) {
            textOffset *= -1;
          }
        } else {
          y2 = pixel;
          textOffset = (1 - lineCount) * lineHeight / 2;
        }
        let backdrop;
        if (optsAtIndex.showLabelBackdrop) {
          const labelPadding = toPadding(optsAtIndex.backdropPadding);
          const height = labelSizes.heights[i4];
          const width = labelSizes.widths[i4];
          let top = y2 + textOffset - labelPadding.top;
          let left = x2 - labelPadding.left;
          switch (textBaseline) {
            case "middle":
              top -= height / 2;
              break;
            case "bottom":
              top -= height;
              break;
          }
          switch (textAlign) {
            case "center":
              left -= width / 2;
              break;
            case "right":
              left -= width;
              break;
          }
          backdrop = {
            left,
            top,
            width: width + labelPadding.width,
            height: height + labelPadding.height,
            color: optsAtIndex.backdropColor
          };
        }
        items.push({
          rotation,
          label,
          font,
          color: color2,
          strokeColor,
          strokeWidth,
          textOffset,
          textAlign,
          textBaseline,
          translation: [x2, y2],
          backdrop
        });
      }
      return items;
    }
    _getXAxisLabelAlignment() {
      const { position, ticks } = this.options;
      const rotation = -toRadians(this.labelRotation);
      if (rotation) {
        return position === "top" ? "left" : "right";
      }
      let align = "center";
      if (ticks.align === "start") {
        align = "left";
      } else if (ticks.align === "end") {
        align = "right";
      }
      return align;
    }
    _getYAxisLabelAlignment(tl) {
      const { position, ticks: { crossAlign, mirror, padding } } = this.options;
      const labelSizes = this._getLabelSizes();
      const tickAndPadding = tl + padding;
      const widest = labelSizes.widest.width;
      let textAlign;
      let x2;
      if (position === "left") {
        if (mirror) {
          x2 = this.right + padding;
          if (crossAlign === "near") {
            textAlign = "left";
          } else if (crossAlign === "center") {
            textAlign = "center";
            x2 += widest / 2;
          } else {
            textAlign = "right";
            x2 += widest;
          }
        } else {
          x2 = this.right - tickAndPadding;
          if (crossAlign === "near") {
            textAlign = "right";
          } else if (crossAlign === "center") {
            textAlign = "center";
            x2 -= widest / 2;
          } else {
            textAlign = "left";
            x2 = this.left;
          }
        }
      } else if (position === "right") {
        if (mirror) {
          x2 = this.left + padding;
          if (crossAlign === "near") {
            textAlign = "right";
          } else if (crossAlign === "center") {
            textAlign = "center";
            x2 -= widest / 2;
          } else {
            textAlign = "left";
            x2 -= widest;
          }
        } else {
          x2 = this.left + tickAndPadding;
          if (crossAlign === "near") {
            textAlign = "left";
          } else if (crossAlign === "center") {
            textAlign = "center";
            x2 += widest / 2;
          } else {
            textAlign = "right";
            x2 = this.right;
          }
        }
      } else {
        textAlign = "right";
      }
      return { textAlign, x: x2 };
    }
    _computeLabelArea() {
      if (this.options.ticks.mirror) {
        return;
      }
      const chart2 = this.chart;
      const position = this.options.position;
      if (position === "left" || position === "right") {
        return { top: 0, left: this.left, bottom: chart2.height, right: this.right };
      }
      if (position === "top" || position === "bottom") {
        return { top: this.top, left: 0, bottom: this.bottom, right: chart2.width };
      }
    }
    drawBackground() {
      const { ctx, options: { backgroundColor }, left, top, width, height } = this;
      if (backgroundColor) {
        ctx.save();
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(left, top, width, height);
        ctx.restore();
      }
    }
    getLineWidthForValue(value) {
      const grid = this.options.grid;
      if (!this._isVisible() || !grid.display) {
        return 0;
      }
      const ticks = this.ticks;
      const index = ticks.findIndex((t4) => t4.value === value);
      if (index >= 0) {
        const opts = grid.setContext(this.getContext(index));
        return opts.lineWidth;
      }
      return 0;
    }
    drawGrid(chartArea) {
      const grid = this.options.grid;
      const ctx = this.ctx;
      const items = this._gridLineItems || (this._gridLineItems = this._computeGridLineItems(chartArea));
      let i4, ilen;
      const drawLine = (p1, p2, style) => {
        if (!style.width || !style.color) {
          return;
        }
        ctx.save();
        ctx.lineWidth = style.width;
        ctx.strokeStyle = style.color;
        ctx.setLineDash(style.borderDash || []);
        ctx.lineDashOffset = style.borderDashOffset;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
      };
      if (grid.display) {
        for (i4 = 0, ilen = items.length; i4 < ilen; ++i4) {
          const item = items[i4];
          if (grid.drawOnChartArea) {
            drawLine({ x: item.x1, y: item.y1 }, { x: item.x2, y: item.y2 }, item);
          }
          if (grid.drawTicks) {
            drawLine({ x: item.tx1, y: item.ty1 }, { x: item.tx2, y: item.ty2 }, {
              color: item.tickColor,
              width: item.tickWidth,
              borderDash: item.tickBorderDash,
              borderDashOffset: item.tickBorderDashOffset
            });
          }
        }
      }
    }
    drawBorder() {
      const { chart: chart2, ctx, options: { grid } } = this;
      const borderOpts = grid.setContext(this.getContext());
      const axisWidth = grid.drawBorder ? borderOpts.borderWidth : 0;
      if (!axisWidth) {
        return;
      }
      const lastLineWidth = grid.setContext(this.getContext(0)).lineWidth;
      const borderValue = this._borderValue;
      let x1, x2, y1, y2;
      if (this.isHorizontal()) {
        x1 = _alignPixel(chart2, this.left, axisWidth) - axisWidth / 2;
        x2 = _alignPixel(chart2, this.right, lastLineWidth) + lastLineWidth / 2;
        y1 = y2 = borderValue;
      } else {
        y1 = _alignPixel(chart2, this.top, axisWidth) - axisWidth / 2;
        y2 = _alignPixel(chart2, this.bottom, lastLineWidth) + lastLineWidth / 2;
        x1 = x2 = borderValue;
      }
      ctx.save();
      ctx.lineWidth = borderOpts.borderWidth;
      ctx.strokeStyle = borderOpts.borderColor;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }
    drawLabels(chartArea) {
      const optionTicks = this.options.ticks;
      if (!optionTicks.display) {
        return;
      }
      const ctx = this.ctx;
      const area = this._computeLabelArea();
      if (area) {
        clipArea(ctx, area);
      }
      const items = this._labelItems || (this._labelItems = this._computeLabelItems(chartArea));
      let i4, ilen;
      for (i4 = 0, ilen = items.length; i4 < ilen; ++i4) {
        const item = items[i4];
        const tickFont = item.font;
        const label = item.label;
        if (item.backdrop) {
          ctx.fillStyle = item.backdrop.color;
          ctx.fillRect(item.backdrop.left, item.backdrop.top, item.backdrop.width, item.backdrop.height);
        }
        let y2 = item.textOffset;
        renderText(ctx, label, 0, y2, tickFont, item);
      }
      if (area) {
        unclipArea(ctx);
      }
    }
    drawTitle() {
      const { ctx, options: { position, title, reverse } } = this;
      if (!title.display) {
        return;
      }
      const font = toFont(title.font);
      const padding = toPadding(title.padding);
      const align = title.align;
      let offset = font.lineHeight / 2;
      if (position === "bottom" || position === "center" || isObject(position)) {
        offset += padding.bottom;
        if (isArray(title.text)) {
          offset += font.lineHeight * (title.text.length - 1);
        }
      } else {
        offset += padding.top;
      }
      const { titleX, titleY, maxWidth, rotation } = titleArgs(this, offset, position, align);
      renderText(ctx, title.text, 0, 0, font, {
        color: title.color,
        maxWidth,
        rotation,
        textAlign: titleAlign(align, position, reverse),
        textBaseline: "middle",
        translation: [titleX, titleY]
      });
    }
    draw(chartArea) {
      if (!this._isVisible()) {
        return;
      }
      this.drawBackground();
      this.drawGrid(chartArea);
      this.drawBorder();
      this.drawTitle();
      this.drawLabels(chartArea);
    }
    _layers() {
      const opts = this.options;
      const tz = opts.ticks && opts.ticks.z || 0;
      const gz = valueOrDefault(opts.grid && opts.grid.z, -1);
      if (!this._isVisible() || this.draw !== Scale.prototype.draw) {
        return [{
          z: tz,
          draw: (chartArea) => {
            this.draw(chartArea);
          }
        }];
      }
      return [{
        z: gz,
        draw: (chartArea) => {
          this.drawBackground();
          this.drawGrid(chartArea);
          this.drawTitle();
        }
      }, {
        z: gz + 1,
        draw: () => {
          this.drawBorder();
        }
      }, {
        z: tz,
        draw: (chartArea) => {
          this.drawLabels(chartArea);
        }
      }];
    }
    getMatchingVisibleMetas(type) {
      const metas = this.chart.getSortedVisibleDatasetMetas();
      const axisID = this.axis + "AxisID";
      const result = [];
      let i4, ilen;
      for (i4 = 0, ilen = metas.length; i4 < ilen; ++i4) {
        const meta = metas[i4];
        if (meta[axisID] === this.id && (!type || meta.type === type)) {
          result.push(meta);
        }
      }
      return result;
    }
    _resolveTickFontOptions(index) {
      const opts = this.options.ticks.setContext(this.getContext(index));
      return toFont(opts.font);
    }
    _maxDigits() {
      const fontSize = this._resolveTickFontOptions(0).lineHeight;
      return (this.isHorizontal() ? this.width : this.height) / fontSize;
    }
  };
  var TypedRegistry = class {
    constructor(type, scope, override) {
      this.type = type;
      this.scope = scope;
      this.override = override;
      this.items = /* @__PURE__ */ Object.create(null);
    }
    isForType(type) {
      return Object.prototype.isPrototypeOf.call(this.type.prototype, type.prototype);
    }
    register(item) {
      const proto = Object.getPrototypeOf(item);
      let parentScope;
      if (isIChartComponent(proto)) {
        parentScope = this.register(proto);
      }
      const items = this.items;
      const id = item.id;
      const scope = this.scope + "." + id;
      if (!id) {
        throw new Error("class does not have id: " + item);
      }
      if (id in items) {
        return scope;
      }
      items[id] = item;
      registerDefaults(item, scope, parentScope);
      if (this.override) {
        defaults.override(item.id, item.overrides);
      }
      return scope;
    }
    get(id) {
      return this.items[id];
    }
    unregister(item) {
      const items = this.items;
      const id = item.id;
      const scope = this.scope;
      if (id in items) {
        delete items[id];
      }
      if (scope && id in defaults[scope]) {
        delete defaults[scope][id];
        if (this.override) {
          delete overrides[id];
        }
      }
    }
  };
  function registerDefaults(item, scope, parentScope) {
    const itemDefaults = merge(/* @__PURE__ */ Object.create(null), [
      parentScope ? defaults.get(parentScope) : {},
      defaults.get(scope),
      item.defaults
    ]);
    defaults.set(scope, itemDefaults);
    if (item.defaultRoutes) {
      routeDefaults(scope, item.defaultRoutes);
    }
    if (item.descriptors) {
      defaults.describe(scope, item.descriptors);
    }
  }
  function routeDefaults(scope, routes) {
    Object.keys(routes).forEach((property) => {
      const propertyParts = property.split(".");
      const sourceName = propertyParts.pop();
      const sourceScope = [scope].concat(propertyParts).join(".");
      const parts = routes[property].split(".");
      const targetName = parts.pop();
      const targetScope = parts.join(".");
      defaults.route(sourceScope, sourceName, targetScope, targetName);
    });
  }
  function isIChartComponent(proto) {
    return "id" in proto && "defaults" in proto;
  }
  var Registry = class {
    constructor() {
      this.controllers = new TypedRegistry(DatasetController, "datasets", true);
      this.elements = new TypedRegistry(Element, "elements");
      this.plugins = new TypedRegistry(Object, "plugins");
      this.scales = new TypedRegistry(Scale, "scales");
      this._typedRegistries = [this.controllers, this.scales, this.elements];
    }
    add(...args) {
      this._each("register", args);
    }
    remove(...args) {
      this._each("unregister", args);
    }
    addControllers(...args) {
      this._each("register", args, this.controllers);
    }
    addElements(...args) {
      this._each("register", args, this.elements);
    }
    addPlugins(...args) {
      this._each("register", args, this.plugins);
    }
    addScales(...args) {
      this._each("register", args, this.scales);
    }
    getController(id) {
      return this._get(id, this.controllers, "controller");
    }
    getElement(id) {
      return this._get(id, this.elements, "element");
    }
    getPlugin(id) {
      return this._get(id, this.plugins, "plugin");
    }
    getScale(id) {
      return this._get(id, this.scales, "scale");
    }
    removeControllers(...args) {
      this._each("unregister", args, this.controllers);
    }
    removeElements(...args) {
      this._each("unregister", args, this.elements);
    }
    removePlugins(...args) {
      this._each("unregister", args, this.plugins);
    }
    removeScales(...args) {
      this._each("unregister", args, this.scales);
    }
    _each(method, args, typedRegistry) {
      [...args].forEach((arg) => {
        const reg = typedRegistry || this._getRegistryForType(arg);
        if (typedRegistry || reg.isForType(arg) || reg === this.plugins && arg.id) {
          this._exec(method, reg, arg);
        } else {
          each(arg, (item) => {
            const itemReg = typedRegistry || this._getRegistryForType(item);
            this._exec(method, itemReg, item);
          });
        }
      });
    }
    _exec(method, registry2, component) {
      const camelMethod = _capitalize(method);
      callback(component["before" + camelMethod], [], component);
      registry2[method](component);
      callback(component["after" + camelMethod], [], component);
    }
    _getRegistryForType(type) {
      for (let i4 = 0; i4 < this._typedRegistries.length; i4++) {
        const reg = this._typedRegistries[i4];
        if (reg.isForType(type)) {
          return reg;
        }
      }
      return this.plugins;
    }
    _get(id, typedRegistry, type) {
      const item = typedRegistry.get(id);
      if (item === void 0) {
        throw new Error('"' + id + '" is not a registered ' + type + ".");
      }
      return item;
    }
  };
  var registry = new Registry();
  var PluginService = class {
    constructor() {
      this._init = [];
    }
    notify(chart2, hook, args, filter) {
      if (hook === "beforeInit") {
        this._init = this._createDescriptors(chart2, true);
        this._notify(this._init, chart2, "install");
      }
      const descriptors2 = filter ? this._descriptors(chart2).filter(filter) : this._descriptors(chart2);
      const result = this._notify(descriptors2, chart2, hook, args);
      if (hook === "afterDestroy") {
        this._notify(descriptors2, chart2, "stop");
        this._notify(this._init, chart2, "uninstall");
      }
      return result;
    }
    _notify(descriptors2, chart2, hook, args) {
      args = args || {};
      for (const descriptor of descriptors2) {
        const plugin = descriptor.plugin;
        const method = plugin[hook];
        const params = [chart2, args, descriptor.options];
        if (callback(method, params, plugin) === false && args.cancelable) {
          return false;
        }
      }
      return true;
    }
    invalidate() {
      if (!isNullOrUndef(this._cache)) {
        this._oldCache = this._cache;
        this._cache = void 0;
      }
    }
    _descriptors(chart2) {
      if (this._cache) {
        return this._cache;
      }
      const descriptors2 = this._cache = this._createDescriptors(chart2);
      this._notifyStateChanges(chart2);
      return descriptors2;
    }
    _createDescriptors(chart2, all) {
      const config = chart2 && chart2.config;
      const options = valueOrDefault(config.options && config.options.plugins, {});
      const plugins = allPlugins(config);
      return options === false && !all ? [] : createDescriptors(chart2, plugins, options, all);
    }
    _notifyStateChanges(chart2) {
      const previousDescriptors = this._oldCache || [];
      const descriptors2 = this._cache;
      const diff = (a3, b2) => a3.filter((x2) => !b2.some((y2) => x2.plugin.id === y2.plugin.id));
      this._notify(diff(previousDescriptors, descriptors2), chart2, "stop");
      this._notify(diff(descriptors2, previousDescriptors), chart2, "start");
    }
  };
  function allPlugins(config) {
    const plugins = [];
    const keys = Object.keys(registry.plugins.items);
    for (let i4 = 0; i4 < keys.length; i4++) {
      plugins.push(registry.getPlugin(keys[i4]));
    }
    const local = config.plugins || [];
    for (let i4 = 0; i4 < local.length; i4++) {
      const plugin = local[i4];
      if (plugins.indexOf(plugin) === -1) {
        plugins.push(plugin);
      }
    }
    return plugins;
  }
  function getOpts(options, all) {
    if (!all && options === false) {
      return null;
    }
    if (options === true) {
      return {};
    }
    return options;
  }
  function createDescriptors(chart2, plugins, options, all) {
    const result = [];
    const context = chart2.getContext();
    for (let i4 = 0; i4 < plugins.length; i4++) {
      const plugin = plugins[i4];
      const id = plugin.id;
      const opts = getOpts(options[id], all);
      if (opts === null) {
        continue;
      }
      result.push({
        plugin,
        options: pluginOpts(chart2.config, plugin, opts, context)
      });
    }
    return result;
  }
  function pluginOpts(config, plugin, opts, context) {
    const keys = config.pluginScopeKeys(plugin);
    const scopes = config.getOptionScopes(opts, keys);
    return config.createResolver(scopes, context, [""], { scriptable: false, indexable: false, allKeys: true });
  }
  function getIndexAxis(type, options) {
    const datasetDefaults = defaults.datasets[type] || {};
    const datasetOptions = (options.datasets || {})[type] || {};
    return datasetOptions.indexAxis || options.indexAxis || datasetDefaults.indexAxis || "x";
  }
  function getAxisFromDefaultScaleID(id, indexAxis) {
    let axis = id;
    if (id === "_index_") {
      axis = indexAxis;
    } else if (id === "_value_") {
      axis = indexAxis === "x" ? "y" : "x";
    }
    return axis;
  }
  function getDefaultScaleIDFromAxis(axis, indexAxis) {
    return axis === indexAxis ? "_index_" : "_value_";
  }
  function axisFromPosition(position) {
    if (position === "top" || position === "bottom") {
      return "x";
    }
    if (position === "left" || position === "right") {
      return "y";
    }
  }
  function determineAxis(id, scaleOptions) {
    if (id === "x" || id === "y") {
      return id;
    }
    return scaleOptions.axis || axisFromPosition(scaleOptions.position) || id.charAt(0).toLowerCase();
  }
  function mergeScaleConfig(config, options) {
    const chartDefaults = overrides[config.type] || { scales: {} };
    const configScales = options.scales || {};
    const chartIndexAxis = getIndexAxis(config.type, options);
    const firstIDs = /* @__PURE__ */ Object.create(null);
    const scales = /* @__PURE__ */ Object.create(null);
    Object.keys(configScales).forEach((id) => {
      const scaleConf = configScales[id];
      if (!isObject(scaleConf)) {
        return console.error(`Invalid scale configuration for scale: ${id}`);
      }
      if (scaleConf._proxy) {
        return console.warn(`Ignoring resolver passed as options for scale: ${id}`);
      }
      const axis = determineAxis(id, scaleConf);
      const defaultId = getDefaultScaleIDFromAxis(axis, chartIndexAxis);
      const defaultScaleOptions = chartDefaults.scales || {};
      firstIDs[axis] = firstIDs[axis] || id;
      scales[id] = mergeIf(/* @__PURE__ */ Object.create(null), [{ axis }, scaleConf, defaultScaleOptions[axis], defaultScaleOptions[defaultId]]);
    });
    config.data.datasets.forEach((dataset) => {
      const type = dataset.type || config.type;
      const indexAxis = dataset.indexAxis || getIndexAxis(type, options);
      const datasetDefaults = overrides[type] || {};
      const defaultScaleOptions = datasetDefaults.scales || {};
      Object.keys(defaultScaleOptions).forEach((defaultID) => {
        const axis = getAxisFromDefaultScaleID(defaultID, indexAxis);
        const id = dataset[axis + "AxisID"] || firstIDs[axis] || axis;
        scales[id] = scales[id] || /* @__PURE__ */ Object.create(null);
        mergeIf(scales[id], [{ axis }, configScales[id], defaultScaleOptions[defaultID]]);
      });
    });
    Object.keys(scales).forEach((key) => {
      const scale = scales[key];
      mergeIf(scale, [defaults.scales[scale.type], defaults.scale]);
    });
    return scales;
  }
  function initOptions(config) {
    const options = config.options || (config.options = {});
    options.plugins = valueOrDefault(options.plugins, {});
    options.scales = mergeScaleConfig(config, options);
  }
  function initData(data) {
    data = data || {};
    data.datasets = data.datasets || [];
    data.labels = data.labels || [];
    return data;
  }
  function initConfig(config) {
    config = config || {};
    config.data = initData(config.data);
    initOptions(config);
    return config;
  }
  var keyCache = /* @__PURE__ */ new Map();
  var keysCached = /* @__PURE__ */ new Set();
  function cachedKeys(cacheKey, generate) {
    let keys = keyCache.get(cacheKey);
    if (!keys) {
      keys = generate();
      keyCache.set(cacheKey, keys);
      keysCached.add(keys);
    }
    return keys;
  }
  var addIfFound = (set2, obj, key) => {
    const opts = resolveObjectKey(obj, key);
    if (opts !== void 0) {
      set2.add(opts);
    }
  };
  var Config = class {
    constructor(config) {
      this._config = initConfig(config);
      this._scopeCache = /* @__PURE__ */ new Map();
      this._resolverCache = /* @__PURE__ */ new Map();
    }
    get platform() {
      return this._config.platform;
    }
    get type() {
      return this._config.type;
    }
    set type(type) {
      this._config.type = type;
    }
    get data() {
      return this._config.data;
    }
    set data(data) {
      this._config.data = initData(data);
    }
    get options() {
      return this._config.options;
    }
    set options(options) {
      this._config.options = options;
    }
    get plugins() {
      return this._config.plugins;
    }
    update() {
      const config = this._config;
      this.clearCache();
      initOptions(config);
    }
    clearCache() {
      this._scopeCache.clear();
      this._resolverCache.clear();
    }
    datasetScopeKeys(datasetType) {
      return cachedKeys(datasetType, () => [[
        `datasets.${datasetType}`,
        ""
      ]]);
    }
    datasetAnimationScopeKeys(datasetType, transition) {
      return cachedKeys(`${datasetType}.transition.${transition}`, () => [
        [
          `datasets.${datasetType}.transitions.${transition}`,
          `transitions.${transition}`
        ],
        [
          `datasets.${datasetType}`,
          ""
        ]
      ]);
    }
    datasetElementScopeKeys(datasetType, elementType) {
      return cachedKeys(`${datasetType}-${elementType}`, () => [[
        `datasets.${datasetType}.elements.${elementType}`,
        `datasets.${datasetType}`,
        `elements.${elementType}`,
        ""
      ]]);
    }
    pluginScopeKeys(plugin) {
      const id = plugin.id;
      const type = this.type;
      return cachedKeys(`${type}-plugin-${id}`, () => [[
        `plugins.${id}`,
        ...plugin.additionalOptionScopes || []
      ]]);
    }
    _cachedScopes(mainScope, resetCache) {
      const _scopeCache = this._scopeCache;
      let cache = _scopeCache.get(mainScope);
      if (!cache || resetCache) {
        cache = /* @__PURE__ */ new Map();
        _scopeCache.set(mainScope, cache);
      }
      return cache;
    }
    getOptionScopes(mainScope, keyLists, resetCache) {
      const { options, type } = this;
      const cache = this._cachedScopes(mainScope, resetCache);
      const cached = cache.get(keyLists);
      if (cached) {
        return cached;
      }
      const scopes = /* @__PURE__ */ new Set();
      keyLists.forEach((keys) => {
        if (mainScope) {
          scopes.add(mainScope);
          keys.forEach((key) => addIfFound(scopes, mainScope, key));
        }
        keys.forEach((key) => addIfFound(scopes, options, key));
        keys.forEach((key) => addIfFound(scopes, overrides[type] || {}, key));
        keys.forEach((key) => addIfFound(scopes, defaults, key));
        keys.forEach((key) => addIfFound(scopes, descriptors, key));
      });
      const array = Array.from(scopes);
      if (array.length === 0) {
        array.push(/* @__PURE__ */ Object.create(null));
      }
      if (keysCached.has(keyLists)) {
        cache.set(keyLists, array);
      }
      return array;
    }
    chartOptionScopes() {
      const { options, type } = this;
      return [
        options,
        overrides[type] || {},
        defaults.datasets[type] || {},
        { type },
        defaults,
        descriptors
      ];
    }
    resolveNamedOptions(scopes, names2, context, prefixes = [""]) {
      const result = { $shared: true };
      const { resolver, subPrefixes } = getResolver(this._resolverCache, scopes, prefixes);
      let options = resolver;
      if (needContext(resolver, names2)) {
        result.$shared = false;
        context = isFunction(context) ? context() : context;
        const subResolver = this.createResolver(scopes, context, subPrefixes);
        options = _attachContext(resolver, context, subResolver);
      }
      for (const prop of names2) {
        result[prop] = options[prop];
      }
      return result;
    }
    createResolver(scopes, context, prefixes = [""], descriptorDefaults) {
      const { resolver } = getResolver(this._resolverCache, scopes, prefixes);
      return isObject(context) ? _attachContext(resolver, context, void 0, descriptorDefaults) : resolver;
    }
  };
  function getResolver(resolverCache, scopes, prefixes) {
    let cache = resolverCache.get(scopes);
    if (!cache) {
      cache = /* @__PURE__ */ new Map();
      resolverCache.set(scopes, cache);
    }
    const cacheKey = prefixes.join();
    let cached = cache.get(cacheKey);
    if (!cached) {
      const resolver = _createResolver(scopes, prefixes);
      cached = {
        resolver,
        subPrefixes: prefixes.filter((p2) => !p2.toLowerCase().includes("hover"))
      };
      cache.set(cacheKey, cached);
    }
    return cached;
  }
  var hasFunction = (value) => isObject(value) && Object.getOwnPropertyNames(value).reduce((acc, key) => acc || isFunction(value[key]), false);
  function needContext(proxy, names2) {
    const { isScriptable, isIndexable } = _descriptors(proxy);
    for (const prop of names2) {
      const scriptable = isScriptable(prop);
      const indexable = isIndexable(prop);
      const value = (indexable || scriptable) && proxy[prop];
      if (scriptable && (isFunction(value) || hasFunction(value)) || indexable && isArray(value)) {
        return true;
      }
    }
    return false;
  }
  var version = "3.7.1";
  var KNOWN_POSITIONS = ["top", "bottom", "left", "right", "chartArea"];
  function positionIsHorizontal(position, axis) {
    return position === "top" || position === "bottom" || KNOWN_POSITIONS.indexOf(position) === -1 && axis === "x";
  }
  function compare2Level(l1, l2) {
    return function(a3, b2) {
      return a3[l1] === b2[l1] ? a3[l2] - b2[l2] : a3[l1] - b2[l1];
    };
  }
  function onAnimationsComplete(context) {
    const chart2 = context.chart;
    const animationOptions2 = chart2.options.animation;
    chart2.notifyPlugins("afterRender");
    callback(animationOptions2 && animationOptions2.onComplete, [context], chart2);
  }
  function onAnimationProgress(context) {
    const chart2 = context.chart;
    const animationOptions2 = chart2.options.animation;
    callback(animationOptions2 && animationOptions2.onProgress, [context], chart2);
  }
  function getCanvas(item) {
    if (_isDomSupported() && typeof item === "string") {
      item = document.getElementById(item);
    } else if (item && item.length) {
      item = item[0];
    }
    if (item && item.canvas) {
      item = item.canvas;
    }
    return item;
  }
  var instances = {};
  var getChart = (key) => {
    const canvas = getCanvas(key);
    return Object.values(instances).filter((c4) => c4.canvas === canvas).pop();
  };
  function moveNumericKeys(obj, start, move) {
    const keys = Object.keys(obj);
    for (const key of keys) {
      const intKey = +key;
      if (intKey >= start) {
        const value = obj[key];
        delete obj[key];
        if (move > 0 || intKey > start) {
          obj[intKey + move] = value;
        }
      }
    }
  }
  function determineLastEvent(e5, lastEvent, inChartArea, isClick) {
    if (!inChartArea || e5.type === "mouseout") {
      return null;
    }
    if (isClick) {
      return lastEvent;
    }
    return e5;
  }
  var Chart = class {
    constructor(item, userConfig) {
      const config = this.config = new Config(userConfig);
      const initialCanvas = getCanvas(item);
      const existingChart = getChart(initialCanvas);
      if (existingChart) {
        throw new Error("Canvas is already in use. Chart with ID '" + existingChart.id + "' must be destroyed before the canvas can be reused.");
      }
      const options = config.createResolver(config.chartOptionScopes(), this.getContext());
      this.platform = new (config.platform || _detectPlatform(initialCanvas))();
      this.platform.updateConfig(config);
      const context = this.platform.acquireContext(initialCanvas, options.aspectRatio);
      const canvas = context && context.canvas;
      const height = canvas && canvas.height;
      const width = canvas && canvas.width;
      this.id = uid();
      this.ctx = context;
      this.canvas = canvas;
      this.width = width;
      this.height = height;
      this._options = options;
      this._aspectRatio = this.aspectRatio;
      this._layers = [];
      this._metasets = [];
      this._stacks = void 0;
      this.boxes = [];
      this.currentDevicePixelRatio = void 0;
      this.chartArea = void 0;
      this._active = [];
      this._lastEvent = void 0;
      this._listeners = {};
      this._responsiveListeners = void 0;
      this._sortedMetasets = [];
      this.scales = {};
      this._plugins = new PluginService();
      this.$proxies = {};
      this._hiddenIndices = {};
      this.attached = false;
      this._animationsDisabled = void 0;
      this.$context = void 0;
      this._doResize = debounce((mode) => this.update(mode), options.resizeDelay || 0);
      this._dataChanges = [];
      instances[this.id] = this;
      if (!context || !canvas) {
        console.error("Failed to create chart: can't acquire context from the given item");
        return;
      }
      animator.listen(this, "complete", onAnimationsComplete);
      animator.listen(this, "progress", onAnimationProgress);
      this._initialize();
      if (this.attached) {
        this.update();
      }
    }
    get aspectRatio() {
      const { options: { aspectRatio, maintainAspectRatio }, width, height, _aspectRatio } = this;
      if (!isNullOrUndef(aspectRatio)) {
        return aspectRatio;
      }
      if (maintainAspectRatio && _aspectRatio) {
        return _aspectRatio;
      }
      return height ? width / height : null;
    }
    get data() {
      return this.config.data;
    }
    set data(data) {
      this.config.data = data;
    }
    get options() {
      return this._options;
    }
    set options(options) {
      this.config.options = options;
    }
    _initialize() {
      this.notifyPlugins("beforeInit");
      if (this.options.responsive) {
        this.resize();
      } else {
        retinaScale(this, this.options.devicePixelRatio);
      }
      this.bindEvents();
      this.notifyPlugins("afterInit");
      return this;
    }
    clear() {
      clearCanvas(this.canvas, this.ctx);
      return this;
    }
    stop() {
      animator.stop(this);
      return this;
    }
    resize(width, height) {
      if (!animator.running(this)) {
        this._resize(width, height);
      } else {
        this._resizeBeforeDraw = { width, height };
      }
    }
    _resize(width, height) {
      const options = this.options;
      const canvas = this.canvas;
      const aspectRatio = options.maintainAspectRatio && this.aspectRatio;
      const newSize = this.platform.getMaximumSize(canvas, width, height, aspectRatio);
      const newRatio = options.devicePixelRatio || this.platform.getDevicePixelRatio();
      const mode = this.width ? "resize" : "attach";
      this.width = newSize.width;
      this.height = newSize.height;
      this._aspectRatio = this.aspectRatio;
      if (!retinaScale(this, newRatio, true)) {
        return;
      }
      this.notifyPlugins("resize", { size: newSize });
      callback(options.onResize, [this, newSize], this);
      if (this.attached) {
        if (this._doResize(mode)) {
          this.render();
        }
      }
    }
    ensureScalesHaveIDs() {
      const options = this.options;
      const scalesOptions = options.scales || {};
      each(scalesOptions, (axisOptions, axisID) => {
        axisOptions.id = axisID;
      });
    }
    buildOrUpdateScales() {
      const options = this.options;
      const scaleOpts = options.scales;
      const scales = this.scales;
      const updated = Object.keys(scales).reduce((obj, id) => {
        obj[id] = false;
        return obj;
      }, {});
      let items = [];
      if (scaleOpts) {
        items = items.concat(Object.keys(scaleOpts).map((id) => {
          const scaleOptions = scaleOpts[id];
          const axis = determineAxis(id, scaleOptions);
          const isRadial = axis === "r";
          const isHorizontal = axis === "x";
          return {
            options: scaleOptions,
            dposition: isRadial ? "chartArea" : isHorizontal ? "bottom" : "left",
            dtype: isRadial ? "radialLinear" : isHorizontal ? "category" : "linear"
          };
        }));
      }
      each(items, (item) => {
        const scaleOptions = item.options;
        const id = scaleOptions.id;
        const axis = determineAxis(id, scaleOptions);
        const scaleType = valueOrDefault(scaleOptions.type, item.dtype);
        if (scaleOptions.position === void 0 || positionIsHorizontal(scaleOptions.position, axis) !== positionIsHorizontal(item.dposition)) {
          scaleOptions.position = item.dposition;
        }
        updated[id] = true;
        let scale = null;
        if (id in scales && scales[id].type === scaleType) {
          scale = scales[id];
        } else {
          const scaleClass = registry.getScale(scaleType);
          scale = new scaleClass({
            id,
            type: scaleType,
            ctx: this.ctx,
            chart: this
          });
          scales[scale.id] = scale;
        }
        scale.init(scaleOptions, options);
      });
      each(updated, (hasUpdated, id) => {
        if (!hasUpdated) {
          delete scales[id];
        }
      });
      each(scales, (scale) => {
        layouts.configure(this, scale, scale.options);
        layouts.addBox(this, scale);
      });
    }
    _updateMetasets() {
      const metasets = this._metasets;
      const numData = this.data.datasets.length;
      const numMeta = metasets.length;
      metasets.sort((a3, b2) => a3.index - b2.index);
      if (numMeta > numData) {
        for (let i4 = numData; i4 < numMeta; ++i4) {
          this._destroyDatasetMeta(i4);
        }
        metasets.splice(numData, numMeta - numData);
      }
      this._sortedMetasets = metasets.slice(0).sort(compare2Level("order", "index"));
    }
    _removeUnreferencedMetasets() {
      const { _metasets: metasets, data: { datasets } } = this;
      if (metasets.length > datasets.length) {
        delete this._stacks;
      }
      metasets.forEach((meta, index) => {
        if (datasets.filter((x2) => x2 === meta._dataset).length === 0) {
          this._destroyDatasetMeta(index);
        }
      });
    }
    buildOrUpdateControllers() {
      const newControllers = [];
      const datasets = this.data.datasets;
      let i4, ilen;
      this._removeUnreferencedMetasets();
      for (i4 = 0, ilen = datasets.length; i4 < ilen; i4++) {
        const dataset = datasets[i4];
        let meta = this.getDatasetMeta(i4);
        const type = dataset.type || this.config.type;
        if (meta.type && meta.type !== type) {
          this._destroyDatasetMeta(i4);
          meta = this.getDatasetMeta(i4);
        }
        meta.type = type;
        meta.indexAxis = dataset.indexAxis || getIndexAxis(type, this.options);
        meta.order = dataset.order || 0;
        meta.index = i4;
        meta.label = "" + dataset.label;
        meta.visible = this.isDatasetVisible(i4);
        if (meta.controller) {
          meta.controller.updateIndex(i4);
          meta.controller.linkScales();
        } else {
          const ControllerClass = registry.getController(type);
          const { datasetElementType, dataElementType } = defaults.datasets[type];
          Object.assign(ControllerClass.prototype, {
            dataElementType: registry.getElement(dataElementType),
            datasetElementType: datasetElementType && registry.getElement(datasetElementType)
          });
          meta.controller = new ControllerClass(this, i4);
          newControllers.push(meta.controller);
        }
      }
      this._updateMetasets();
      return newControllers;
    }
    _resetElements() {
      each(this.data.datasets, (dataset, datasetIndex) => {
        this.getDatasetMeta(datasetIndex).controller.reset();
      }, this);
    }
    reset() {
      this._resetElements();
      this.notifyPlugins("reset");
    }
    update(mode) {
      const config = this.config;
      config.update();
      const options = this._options = config.createResolver(config.chartOptionScopes(), this.getContext());
      const animsDisabled = this._animationsDisabled = !options.animation;
      this._updateScales();
      this._checkEventBindings();
      this._updateHiddenIndices();
      this._plugins.invalidate();
      if (this.notifyPlugins("beforeUpdate", { mode, cancelable: true }) === false) {
        return;
      }
      const newControllers = this.buildOrUpdateControllers();
      this.notifyPlugins("beforeElementsUpdate");
      let minPadding = 0;
      for (let i4 = 0, ilen = this.data.datasets.length; i4 < ilen; i4++) {
        const { controller } = this.getDatasetMeta(i4);
        const reset = !animsDisabled && newControllers.indexOf(controller) === -1;
        controller.buildOrUpdateElements(reset);
        minPadding = Math.max(+controller.getMaxOverflow(), minPadding);
      }
      minPadding = this._minPadding = options.layout.autoPadding ? minPadding : 0;
      this._updateLayout(minPadding);
      if (!animsDisabled) {
        each(newControllers, (controller) => {
          controller.reset();
        });
      }
      this._updateDatasets(mode);
      this.notifyPlugins("afterUpdate", { mode });
      this._layers.sort(compare2Level("z", "_idx"));
      const { _active, _lastEvent } = this;
      if (_lastEvent) {
        this._eventHandler(_lastEvent, true);
      } else if (_active.length) {
        this._updateHoverStyles(_active, _active, true);
      }
      this.render();
    }
    _updateScales() {
      each(this.scales, (scale) => {
        layouts.removeBox(this, scale);
      });
      this.ensureScalesHaveIDs();
      this.buildOrUpdateScales();
    }
    _checkEventBindings() {
      const options = this.options;
      const existingEvents = new Set(Object.keys(this._listeners));
      const newEvents = new Set(options.events);
      if (!setsEqual(existingEvents, newEvents) || !!this._responsiveListeners !== options.responsive) {
        this.unbindEvents();
        this.bindEvents();
      }
    }
    _updateHiddenIndices() {
      const { _hiddenIndices } = this;
      const changes = this._getUniformDataChanges() || [];
      for (const { method, start, count } of changes) {
        const move = method === "_removeElements" ? -count : count;
        moveNumericKeys(_hiddenIndices, start, move);
      }
    }
    _getUniformDataChanges() {
      const _dataChanges = this._dataChanges;
      if (!_dataChanges || !_dataChanges.length) {
        return;
      }
      this._dataChanges = [];
      const datasetCount = this.data.datasets.length;
      const makeSet = (idx) => new Set(_dataChanges.filter((c4) => c4[0] === idx).map((c4, i4) => i4 + "," + c4.splice(1).join(",")));
      const changeSet = makeSet(0);
      for (let i4 = 1; i4 < datasetCount; i4++) {
        if (!setsEqual(changeSet, makeSet(i4))) {
          return;
        }
      }
      return Array.from(changeSet).map((c4) => c4.split(",")).map((a3) => ({ method: a3[1], start: +a3[2], count: +a3[3] }));
    }
    _updateLayout(minPadding) {
      if (this.notifyPlugins("beforeLayout", { cancelable: true }) === false) {
        return;
      }
      layouts.update(this, this.width, this.height, minPadding);
      const area = this.chartArea;
      const noArea = area.width <= 0 || area.height <= 0;
      this._layers = [];
      each(this.boxes, (box) => {
        if (noArea && box.position === "chartArea") {
          return;
        }
        if (box.configure) {
          box.configure();
        }
        this._layers.push(...box._layers());
      }, this);
      this._layers.forEach((item, index) => {
        item._idx = index;
      });
      this.notifyPlugins("afterLayout");
    }
    _updateDatasets(mode) {
      if (this.notifyPlugins("beforeDatasetsUpdate", { mode, cancelable: true }) === false) {
        return;
      }
      for (let i4 = 0, ilen = this.data.datasets.length; i4 < ilen; ++i4) {
        this.getDatasetMeta(i4).controller.configure();
      }
      for (let i4 = 0, ilen = this.data.datasets.length; i4 < ilen; ++i4) {
        this._updateDataset(i4, isFunction(mode) ? mode({ datasetIndex: i4 }) : mode);
      }
      this.notifyPlugins("afterDatasetsUpdate", { mode });
    }
    _updateDataset(index, mode) {
      const meta = this.getDatasetMeta(index);
      const args = { meta, index, mode, cancelable: true };
      if (this.notifyPlugins("beforeDatasetUpdate", args) === false) {
        return;
      }
      meta.controller._update(mode);
      args.cancelable = false;
      this.notifyPlugins("afterDatasetUpdate", args);
    }
    render() {
      if (this.notifyPlugins("beforeRender", { cancelable: true }) === false) {
        return;
      }
      if (animator.has(this)) {
        if (this.attached && !animator.running(this)) {
          animator.start(this);
        }
      } else {
        this.draw();
        onAnimationsComplete({ chart: this });
      }
    }
    draw() {
      let i4;
      if (this._resizeBeforeDraw) {
        const { width, height } = this._resizeBeforeDraw;
        this._resize(width, height);
        this._resizeBeforeDraw = null;
      }
      this.clear();
      if (this.width <= 0 || this.height <= 0) {
        return;
      }
      if (this.notifyPlugins("beforeDraw", { cancelable: true }) === false) {
        return;
      }
      const layers = this._layers;
      for (i4 = 0; i4 < layers.length && layers[i4].z <= 0; ++i4) {
        layers[i4].draw(this.chartArea);
      }
      this._drawDatasets();
      for (; i4 < layers.length; ++i4) {
        layers[i4].draw(this.chartArea);
      }
      this.notifyPlugins("afterDraw");
    }
    _getSortedDatasetMetas(filterVisible) {
      const metasets = this._sortedMetasets;
      const result = [];
      let i4, ilen;
      for (i4 = 0, ilen = metasets.length; i4 < ilen; ++i4) {
        const meta = metasets[i4];
        if (!filterVisible || meta.visible) {
          result.push(meta);
        }
      }
      return result;
    }
    getSortedVisibleDatasetMetas() {
      return this._getSortedDatasetMetas(true);
    }
    _drawDatasets() {
      if (this.notifyPlugins("beforeDatasetsDraw", { cancelable: true }) === false) {
        return;
      }
      const metasets = this.getSortedVisibleDatasetMetas();
      for (let i4 = metasets.length - 1; i4 >= 0; --i4) {
        this._drawDataset(metasets[i4]);
      }
      this.notifyPlugins("afterDatasetsDraw");
    }
    _drawDataset(meta) {
      const ctx = this.ctx;
      const clip = meta._clip;
      const useClip = !clip.disabled;
      const area = this.chartArea;
      const args = {
        meta,
        index: meta.index,
        cancelable: true
      };
      if (this.notifyPlugins("beforeDatasetDraw", args) === false) {
        return;
      }
      if (useClip) {
        clipArea(ctx, {
          left: clip.left === false ? 0 : area.left - clip.left,
          right: clip.right === false ? this.width : area.right + clip.right,
          top: clip.top === false ? 0 : area.top - clip.top,
          bottom: clip.bottom === false ? this.height : area.bottom + clip.bottom
        });
      }
      meta.controller.draw();
      if (useClip) {
        unclipArea(ctx);
      }
      args.cancelable = false;
      this.notifyPlugins("afterDatasetDraw", args);
    }
    getElementsAtEventForMode(e5, mode, options, useFinalPosition) {
      const method = Interaction.modes[mode];
      if (typeof method === "function") {
        return method(this, e5, options, useFinalPosition);
      }
      return [];
    }
    getDatasetMeta(datasetIndex) {
      const dataset = this.data.datasets[datasetIndex];
      const metasets = this._metasets;
      let meta = metasets.filter((x2) => x2 && x2._dataset === dataset).pop();
      if (!meta) {
        meta = {
          type: null,
          data: [],
          dataset: null,
          controller: null,
          hidden: null,
          xAxisID: null,
          yAxisID: null,
          order: dataset && dataset.order || 0,
          index: datasetIndex,
          _dataset: dataset,
          _parsed: [],
          _sorted: false
        };
        metasets.push(meta);
      }
      return meta;
    }
    getContext() {
      return this.$context || (this.$context = createContext(null, { chart: this, type: "chart" }));
    }
    getVisibleDatasetCount() {
      return this.getSortedVisibleDatasetMetas().length;
    }
    isDatasetVisible(datasetIndex) {
      const dataset = this.data.datasets[datasetIndex];
      if (!dataset) {
        return false;
      }
      const meta = this.getDatasetMeta(datasetIndex);
      return typeof meta.hidden === "boolean" ? !meta.hidden : !dataset.hidden;
    }
    setDatasetVisibility(datasetIndex, visible) {
      const meta = this.getDatasetMeta(datasetIndex);
      meta.hidden = !visible;
    }
    toggleDataVisibility(index) {
      this._hiddenIndices[index] = !this._hiddenIndices[index];
    }
    getDataVisibility(index) {
      return !this._hiddenIndices[index];
    }
    _updateVisibility(datasetIndex, dataIndex, visible) {
      const mode = visible ? "show" : "hide";
      const meta = this.getDatasetMeta(datasetIndex);
      const anims = meta.controller._resolveAnimations(void 0, mode);
      if (defined(dataIndex)) {
        meta.data[dataIndex].hidden = !visible;
        this.update();
      } else {
        this.setDatasetVisibility(datasetIndex, visible);
        anims.update(meta, { visible });
        this.update((ctx) => ctx.datasetIndex === datasetIndex ? mode : void 0);
      }
    }
    hide(datasetIndex, dataIndex) {
      this._updateVisibility(datasetIndex, dataIndex, false);
    }
    show(datasetIndex, dataIndex) {
      this._updateVisibility(datasetIndex, dataIndex, true);
    }
    _destroyDatasetMeta(datasetIndex) {
      const meta = this._metasets[datasetIndex];
      if (meta && meta.controller) {
        meta.controller._destroy();
      }
      delete this._metasets[datasetIndex];
    }
    _stop() {
      let i4, ilen;
      this.stop();
      animator.remove(this);
      for (i4 = 0, ilen = this.data.datasets.length; i4 < ilen; ++i4) {
        this._destroyDatasetMeta(i4);
      }
    }
    destroy() {
      this.notifyPlugins("beforeDestroy");
      const { canvas, ctx } = this;
      this._stop();
      this.config.clearCache();
      if (canvas) {
        this.unbindEvents();
        clearCanvas(canvas, ctx);
        this.platform.releaseContext(ctx);
        this.canvas = null;
        this.ctx = null;
      }
      this.notifyPlugins("destroy");
      delete instances[this.id];
      this.notifyPlugins("afterDestroy");
    }
    toBase64Image(...args) {
      return this.canvas.toDataURL(...args);
    }
    bindEvents() {
      this.bindUserEvents();
      if (this.options.responsive) {
        this.bindResponsiveEvents();
      } else {
        this.attached = true;
      }
    }
    bindUserEvents() {
      const listeners = this._listeners;
      const platform = this.platform;
      const _add = (type, listener2) => {
        platform.addEventListener(this, type, listener2);
        listeners[type] = listener2;
      };
      const listener = (e5, x2, y2) => {
        e5.offsetX = x2;
        e5.offsetY = y2;
        this._eventHandler(e5);
      };
      each(this.options.events, (type) => _add(type, listener));
    }
    bindResponsiveEvents() {
      if (!this._responsiveListeners) {
        this._responsiveListeners = {};
      }
      const listeners = this._responsiveListeners;
      const platform = this.platform;
      const _add = (type, listener2) => {
        platform.addEventListener(this, type, listener2);
        listeners[type] = listener2;
      };
      const _remove = (type, listener2) => {
        if (listeners[type]) {
          platform.removeEventListener(this, type, listener2);
          delete listeners[type];
        }
      };
      const listener = (width, height) => {
        if (this.canvas) {
          this.resize(width, height);
        }
      };
      let detached;
      const attached = () => {
        _remove("attach", attached);
        this.attached = true;
        this.resize();
        _add("resize", listener);
        _add("detach", detached);
      };
      detached = () => {
        this.attached = false;
        _remove("resize", listener);
        this._stop();
        this._resize(0, 0);
        _add("attach", attached);
      };
      if (platform.isAttached(this.canvas)) {
        attached();
      } else {
        detached();
      }
    }
    unbindEvents() {
      each(this._listeners, (listener, type) => {
        this.platform.removeEventListener(this, type, listener);
      });
      this._listeners = {};
      each(this._responsiveListeners, (listener, type) => {
        this.platform.removeEventListener(this, type, listener);
      });
      this._responsiveListeners = void 0;
    }
    updateHoverStyle(items, mode, enabled) {
      const prefix = enabled ? "set" : "remove";
      let meta, item, i4, ilen;
      if (mode === "dataset") {
        meta = this.getDatasetMeta(items[0].datasetIndex);
        meta.controller["_" + prefix + "DatasetHoverStyle"]();
      }
      for (i4 = 0, ilen = items.length; i4 < ilen; ++i4) {
        item = items[i4];
        const controller = item && this.getDatasetMeta(item.datasetIndex).controller;
        if (controller) {
          controller[prefix + "HoverStyle"](item.element, item.datasetIndex, item.index);
        }
      }
    }
    getActiveElements() {
      return this._active || [];
    }
    setActiveElements(activeElements) {
      const lastActive = this._active || [];
      const active = activeElements.map(({ datasetIndex, index }) => {
        const meta = this.getDatasetMeta(datasetIndex);
        if (!meta) {
          throw new Error("No dataset found at index " + datasetIndex);
        }
        return {
          datasetIndex,
          element: meta.data[index],
          index
        };
      });
      const changed = !_elementsEqual(active, lastActive);
      if (changed) {
        this._active = active;
        this._lastEvent = null;
        this._updateHoverStyles(active, lastActive);
      }
    }
    notifyPlugins(hook, args, filter) {
      return this._plugins.notify(this, hook, args, filter);
    }
    _updateHoverStyles(active, lastActive, replay) {
      const hoverOptions = this.options.hover;
      const diff = (a3, b2) => a3.filter((x2) => !b2.some((y2) => x2.datasetIndex === y2.datasetIndex && x2.index === y2.index));
      const deactivated = diff(lastActive, active);
      const activated = replay ? active : diff(active, lastActive);
      if (deactivated.length) {
        this.updateHoverStyle(deactivated, hoverOptions.mode, false);
      }
      if (activated.length && hoverOptions.mode) {
        this.updateHoverStyle(activated, hoverOptions.mode, true);
      }
    }
    _eventHandler(e5, replay) {
      const args = {
        event: e5,
        replay,
        cancelable: true,
        inChartArea: _isPointInArea(e5, this.chartArea, this._minPadding)
      };
      const eventFilter = (plugin) => (plugin.options.events || this.options.events).includes(e5.native.type);
      if (this.notifyPlugins("beforeEvent", args, eventFilter) === false) {
        return;
      }
      const changed = this._handleEvent(e5, replay, args.inChartArea);
      args.cancelable = false;
      this.notifyPlugins("afterEvent", args, eventFilter);
      if (changed || args.changed) {
        this.render();
      }
      return this;
    }
    _handleEvent(e5, replay, inChartArea) {
      const { _active: lastActive = [], options } = this;
      const useFinalPosition = replay;
      const active = this._getActiveElements(e5, lastActive, inChartArea, useFinalPosition);
      const isClick = _isClickEvent(e5);
      const lastEvent = determineLastEvent(e5, this._lastEvent, inChartArea, isClick);
      if (inChartArea) {
        this._lastEvent = null;
        callback(options.onHover, [e5, active, this], this);
        if (isClick) {
          callback(options.onClick, [e5, active, this], this);
        }
      }
      const changed = !_elementsEqual(active, lastActive);
      if (changed || replay) {
        this._active = active;
        this._updateHoverStyles(active, lastActive, replay);
      }
      this._lastEvent = lastEvent;
      return changed;
    }
    _getActiveElements(e5, lastActive, inChartArea, useFinalPosition) {
      if (e5.type === "mouseout") {
        return [];
      }
      if (!inChartArea) {
        return lastActive;
      }
      const hoverOptions = this.options.hover;
      return this.getElementsAtEventForMode(e5, hoverOptions.mode, hoverOptions, useFinalPosition);
    }
  };
  var invalidatePlugins = () => each(Chart.instances, (chart2) => chart2._plugins.invalidate());
  var enumerable = true;
  Object.defineProperties(Chart, {
    defaults: {
      enumerable,
      value: defaults
    },
    instances: {
      enumerable,
      value: instances
    },
    overrides: {
      enumerable,
      value: overrides
    },
    registry: {
      enumerable,
      value: registry
    },
    version: {
      enumerable,
      value: version
    },
    getChart: {
      enumerable,
      value: getChart
    },
    register: {
      enumerable,
      value: (...items) => {
        registry.add(...items);
        invalidatePlugins();
      }
    },
    unregister: {
      enumerable,
      value: (...items) => {
        registry.remove(...items);
        invalidatePlugins();
      }
    }
  });
  function clipArc(ctx, element, endAngle) {
    const { startAngle, pixelMargin, x: x2, y: y2, outerRadius, innerRadius } = element;
    let angleMargin = pixelMargin / outerRadius;
    ctx.beginPath();
    ctx.arc(x2, y2, outerRadius, startAngle - angleMargin, endAngle + angleMargin);
    if (innerRadius > pixelMargin) {
      angleMargin = pixelMargin / innerRadius;
      ctx.arc(x2, y2, innerRadius, endAngle + angleMargin, startAngle - angleMargin, true);
    } else {
      ctx.arc(x2, y2, pixelMargin, endAngle + HALF_PI, startAngle - HALF_PI);
    }
    ctx.closePath();
    ctx.clip();
  }
  function toRadiusCorners(value) {
    return _readValueToProps(value, ["outerStart", "outerEnd", "innerStart", "innerEnd"]);
  }
  function parseBorderRadius$1(arc, innerRadius, outerRadius, angleDelta) {
    const o4 = toRadiusCorners(arc.options.borderRadius);
    const halfThickness = (outerRadius - innerRadius) / 2;
    const innerLimit = Math.min(halfThickness, angleDelta * innerRadius / 2);
    const computeOuterLimit = (val) => {
      const outerArcLimit = (outerRadius - Math.min(halfThickness, val)) * angleDelta / 2;
      return _limitValue(val, 0, Math.min(halfThickness, outerArcLimit));
    };
    return {
      outerStart: computeOuterLimit(o4.outerStart),
      outerEnd: computeOuterLimit(o4.outerEnd),
      innerStart: _limitValue(o4.innerStart, 0, innerLimit),
      innerEnd: _limitValue(o4.innerEnd, 0, innerLimit)
    };
  }
  function rThetaToXY(r3, theta, x2, y2) {
    return {
      x: x2 + r3 * Math.cos(theta),
      y: y2 + r3 * Math.sin(theta)
    };
  }
  function pathArc(ctx, element, offset, spacing, end) {
    const { x: x2, y: y2, startAngle: start, pixelMargin, innerRadius: innerR } = element;
    const outerRadius = Math.max(element.outerRadius + spacing + offset - pixelMargin, 0);
    const innerRadius = innerR > 0 ? innerR + spacing + offset + pixelMargin : 0;
    let spacingOffset = 0;
    const alpha = end - start;
    if (spacing) {
      const noSpacingInnerRadius = innerR > 0 ? innerR - spacing : 0;
      const noSpacingOuterRadius = outerRadius > 0 ? outerRadius - spacing : 0;
      const avNogSpacingRadius = (noSpacingInnerRadius + noSpacingOuterRadius) / 2;
      const adjustedAngle = avNogSpacingRadius !== 0 ? alpha * avNogSpacingRadius / (avNogSpacingRadius + spacing) : alpha;
      spacingOffset = (alpha - adjustedAngle) / 2;
    }
    const beta = Math.max(1e-3, alpha * outerRadius - offset / PI) / outerRadius;
    const angleOffset = (alpha - beta) / 2;
    const startAngle = start + angleOffset + spacingOffset;
    const endAngle = end - angleOffset - spacingOffset;
    const { outerStart, outerEnd, innerStart, innerEnd } = parseBorderRadius$1(element, innerRadius, outerRadius, endAngle - startAngle);
    const outerStartAdjustedRadius = outerRadius - outerStart;
    const outerEndAdjustedRadius = outerRadius - outerEnd;
    const outerStartAdjustedAngle = startAngle + outerStart / outerStartAdjustedRadius;
    const outerEndAdjustedAngle = endAngle - outerEnd / outerEndAdjustedRadius;
    const innerStartAdjustedRadius = innerRadius + innerStart;
    const innerEndAdjustedRadius = innerRadius + innerEnd;
    const innerStartAdjustedAngle = startAngle + innerStart / innerStartAdjustedRadius;
    const innerEndAdjustedAngle = endAngle - innerEnd / innerEndAdjustedRadius;
    ctx.beginPath();
    ctx.arc(x2, y2, outerRadius, outerStartAdjustedAngle, outerEndAdjustedAngle);
    if (outerEnd > 0) {
      const pCenter = rThetaToXY(outerEndAdjustedRadius, outerEndAdjustedAngle, x2, y2);
      ctx.arc(pCenter.x, pCenter.y, outerEnd, outerEndAdjustedAngle, endAngle + HALF_PI);
    }
    const p4 = rThetaToXY(innerEndAdjustedRadius, endAngle, x2, y2);
    ctx.lineTo(p4.x, p4.y);
    if (innerEnd > 0) {
      const pCenter = rThetaToXY(innerEndAdjustedRadius, innerEndAdjustedAngle, x2, y2);
      ctx.arc(pCenter.x, pCenter.y, innerEnd, endAngle + HALF_PI, innerEndAdjustedAngle + Math.PI);
    }
    ctx.arc(x2, y2, innerRadius, endAngle - innerEnd / innerRadius, startAngle + innerStart / innerRadius, true);
    if (innerStart > 0) {
      const pCenter = rThetaToXY(innerStartAdjustedRadius, innerStartAdjustedAngle, x2, y2);
      ctx.arc(pCenter.x, pCenter.y, innerStart, innerStartAdjustedAngle + Math.PI, startAngle - HALF_PI);
    }
    const p8 = rThetaToXY(outerStartAdjustedRadius, startAngle, x2, y2);
    ctx.lineTo(p8.x, p8.y);
    if (outerStart > 0) {
      const pCenter = rThetaToXY(outerStartAdjustedRadius, outerStartAdjustedAngle, x2, y2);
      ctx.arc(pCenter.x, pCenter.y, outerStart, startAngle - HALF_PI, outerStartAdjustedAngle);
    }
    ctx.closePath();
  }
  function drawArc(ctx, element, offset, spacing) {
    const { fullCircles, startAngle, circumference } = element;
    let endAngle = element.endAngle;
    if (fullCircles) {
      pathArc(ctx, element, offset, spacing, startAngle + TAU);
      for (let i4 = 0; i4 < fullCircles; ++i4) {
        ctx.fill();
      }
      if (!isNaN(circumference)) {
        endAngle = startAngle + circumference % TAU;
        if (circumference % TAU === 0) {
          endAngle += TAU;
        }
      }
    }
    pathArc(ctx, element, offset, spacing, endAngle);
    ctx.fill();
    return endAngle;
  }
  function drawFullCircleBorders(ctx, element, inner) {
    const { x: x2, y: y2, startAngle, pixelMargin, fullCircles } = element;
    const outerRadius = Math.max(element.outerRadius - pixelMargin, 0);
    const innerRadius = element.innerRadius + pixelMargin;
    let i4;
    if (inner) {
      clipArc(ctx, element, startAngle + TAU);
    }
    ctx.beginPath();
    ctx.arc(x2, y2, innerRadius, startAngle + TAU, startAngle, true);
    for (i4 = 0; i4 < fullCircles; ++i4) {
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x2, y2, outerRadius, startAngle, startAngle + TAU);
    for (i4 = 0; i4 < fullCircles; ++i4) {
      ctx.stroke();
    }
  }
  function drawBorder(ctx, element, offset, spacing, endAngle) {
    const { options } = element;
    const { borderWidth, borderJoinStyle } = options;
    const inner = options.borderAlign === "inner";
    if (!borderWidth) {
      return;
    }
    if (inner) {
      ctx.lineWidth = borderWidth * 2;
      ctx.lineJoin = borderJoinStyle || "round";
    } else {
      ctx.lineWidth = borderWidth;
      ctx.lineJoin = borderJoinStyle || "bevel";
    }
    if (element.fullCircles) {
      drawFullCircleBorders(ctx, element, inner);
    }
    if (inner) {
      clipArc(ctx, element, endAngle);
    }
    pathArc(ctx, element, offset, spacing, endAngle);
    ctx.stroke();
  }
  var ArcElement = class extends Element {
    constructor(cfg) {
      super();
      this.options = void 0;
      this.circumference = void 0;
      this.startAngle = void 0;
      this.endAngle = void 0;
      this.innerRadius = void 0;
      this.outerRadius = void 0;
      this.pixelMargin = 0;
      this.fullCircles = 0;
      if (cfg) {
        Object.assign(this, cfg);
      }
    }
    inRange(chartX, chartY, useFinalPosition) {
      const point = this.getProps(["x", "y"], useFinalPosition);
      const { angle, distance } = getAngleFromPoint(point, { x: chartX, y: chartY });
      const { startAngle, endAngle, innerRadius, outerRadius, circumference } = this.getProps([
        "startAngle",
        "endAngle",
        "innerRadius",
        "outerRadius",
        "circumference"
      ], useFinalPosition);
      const rAdjust = this.options.spacing / 2;
      const _circumference = valueOrDefault(circumference, endAngle - startAngle);
      const betweenAngles = _circumference >= TAU || _angleBetween(angle, startAngle, endAngle);
      const withinRadius = _isBetween(distance, innerRadius + rAdjust, outerRadius + rAdjust);
      return betweenAngles && withinRadius;
    }
    getCenterPoint(useFinalPosition) {
      const { x: x2, y: y2, startAngle, endAngle, innerRadius, outerRadius } = this.getProps([
        "x",
        "y",
        "startAngle",
        "endAngle",
        "innerRadius",
        "outerRadius",
        "circumference"
      ], useFinalPosition);
      const { offset, spacing } = this.options;
      const halfAngle = (startAngle + endAngle) / 2;
      const halfRadius = (innerRadius + outerRadius + spacing + offset) / 2;
      return {
        x: x2 + Math.cos(halfAngle) * halfRadius,
        y: y2 + Math.sin(halfAngle) * halfRadius
      };
    }
    tooltipPosition(useFinalPosition) {
      return this.getCenterPoint(useFinalPosition);
    }
    draw(ctx) {
      const { options, circumference } = this;
      const offset = (options.offset || 0) / 2;
      const spacing = (options.spacing || 0) / 2;
      this.pixelMargin = options.borderAlign === "inner" ? 0.33 : 0;
      this.fullCircles = circumference > TAU ? Math.floor(circumference / TAU) : 0;
      if (circumference === 0 || this.innerRadius < 0 || this.outerRadius < 0) {
        return;
      }
      ctx.save();
      let radiusOffset = 0;
      if (offset) {
        radiusOffset = offset / 2;
        const halfAngle = (this.startAngle + this.endAngle) / 2;
        ctx.translate(Math.cos(halfAngle) * radiusOffset, Math.sin(halfAngle) * radiusOffset);
        if (this.circumference >= PI) {
          radiusOffset = offset;
        }
      }
      ctx.fillStyle = options.backgroundColor;
      ctx.strokeStyle = options.borderColor;
      const endAngle = drawArc(ctx, this, radiusOffset, spacing);
      drawBorder(ctx, this, radiusOffset, spacing, endAngle);
      ctx.restore();
    }
  };
  ArcElement.id = "arc";
  ArcElement.defaults = {
    borderAlign: "center",
    borderColor: "#fff",
    borderJoinStyle: void 0,
    borderRadius: 0,
    borderWidth: 2,
    offset: 0,
    spacing: 0,
    angle: void 0
  };
  ArcElement.defaultRoutes = {
    backgroundColor: "backgroundColor"
  };
  function setStyle(ctx, options, style = options) {
    ctx.lineCap = valueOrDefault(style.borderCapStyle, options.borderCapStyle);
    ctx.setLineDash(valueOrDefault(style.borderDash, options.borderDash));
    ctx.lineDashOffset = valueOrDefault(style.borderDashOffset, options.borderDashOffset);
    ctx.lineJoin = valueOrDefault(style.borderJoinStyle, options.borderJoinStyle);
    ctx.lineWidth = valueOrDefault(style.borderWidth, options.borderWidth);
    ctx.strokeStyle = valueOrDefault(style.borderColor, options.borderColor);
  }
  function lineTo(ctx, previous, target) {
    ctx.lineTo(target.x, target.y);
  }
  function getLineMethod(options) {
    if (options.stepped) {
      return _steppedLineTo;
    }
    if (options.tension || options.cubicInterpolationMode === "monotone") {
      return _bezierCurveTo;
    }
    return lineTo;
  }
  function pathVars(points, segment, params = {}) {
    const count = points.length;
    const { start: paramsStart = 0, end: paramsEnd = count - 1 } = params;
    const { start: segmentStart, end: segmentEnd } = segment;
    const start = Math.max(paramsStart, segmentStart);
    const end = Math.min(paramsEnd, segmentEnd);
    const outside = paramsStart < segmentStart && paramsEnd < segmentStart || paramsStart > segmentEnd && paramsEnd > segmentEnd;
    return {
      count,
      start,
      loop: segment.loop,
      ilen: end < start && !outside ? count + end - start : end - start
    };
  }
  function pathSegment(ctx, line, segment, params) {
    const { points, options } = line;
    const { count, start, loop, ilen } = pathVars(points, segment, params);
    const lineMethod = getLineMethod(options);
    let { move = true, reverse } = params || {};
    let i4, point, prev;
    for (i4 = 0; i4 <= ilen; ++i4) {
      point = points[(start + (reverse ? ilen - i4 : i4)) % count];
      if (point.skip) {
        continue;
      } else if (move) {
        ctx.moveTo(point.x, point.y);
        move = false;
      } else {
        lineMethod(ctx, prev, point, reverse, options.stepped);
      }
      prev = point;
    }
    if (loop) {
      point = points[(start + (reverse ? ilen : 0)) % count];
      lineMethod(ctx, prev, point, reverse, options.stepped);
    }
    return !!loop;
  }
  function fastPathSegment(ctx, line, segment, params) {
    const points = line.points;
    const { count, start, ilen } = pathVars(points, segment, params);
    const { move = true, reverse } = params || {};
    let avgX = 0;
    let countX = 0;
    let i4, point, prevX, minY, maxY, lastY;
    const pointIndex = (index) => (start + (reverse ? ilen - index : index)) % count;
    const drawX = () => {
      if (minY !== maxY) {
        ctx.lineTo(avgX, maxY);
        ctx.lineTo(avgX, minY);
        ctx.lineTo(avgX, lastY);
      }
    };
    if (move) {
      point = points[pointIndex(0)];
      ctx.moveTo(point.x, point.y);
    }
    for (i4 = 0; i4 <= ilen; ++i4) {
      point = points[pointIndex(i4)];
      if (point.skip) {
        continue;
      }
      const x2 = point.x;
      const y2 = point.y;
      const truncX = x2 | 0;
      if (truncX === prevX) {
        if (y2 < minY) {
          minY = y2;
        } else if (y2 > maxY) {
          maxY = y2;
        }
        avgX = (countX * avgX + x2) / ++countX;
      } else {
        drawX();
        ctx.lineTo(x2, y2);
        prevX = truncX;
        countX = 0;
        minY = maxY = y2;
      }
      lastY = y2;
    }
    drawX();
  }
  function _getSegmentMethod(line) {
    const opts = line.options;
    const borderDash = opts.borderDash && opts.borderDash.length;
    const useFastPath = !line._decimated && !line._loop && !opts.tension && opts.cubicInterpolationMode !== "monotone" && !opts.stepped && !borderDash;
    return useFastPath ? fastPathSegment : pathSegment;
  }
  function _getInterpolationMethod(options) {
    if (options.stepped) {
      return _steppedInterpolation;
    }
    if (options.tension || options.cubicInterpolationMode === "monotone") {
      return _bezierInterpolation;
    }
    return _pointInLine;
  }
  function strokePathWithCache(ctx, line, start, count) {
    let path = line._path;
    if (!path) {
      path = line._path = new Path2D();
      if (line.path(path, start, count)) {
        path.closePath();
      }
    }
    setStyle(ctx, line.options);
    ctx.stroke(path);
  }
  function strokePathDirect(ctx, line, start, count) {
    const { segments, options } = line;
    const segmentMethod = _getSegmentMethod(line);
    for (const segment of segments) {
      setStyle(ctx, options, segment.style);
      ctx.beginPath();
      if (segmentMethod(ctx, line, segment, { start, end: start + count - 1 })) {
        ctx.closePath();
      }
      ctx.stroke();
    }
  }
  var usePath2D = typeof Path2D === "function";
  function draw(ctx, line, start, count) {
    if (usePath2D && !line.options.segment) {
      strokePathWithCache(ctx, line, start, count);
    } else {
      strokePathDirect(ctx, line, start, count);
    }
  }
  var LineElement = class extends Element {
    constructor(cfg) {
      super();
      this.animated = true;
      this.options = void 0;
      this._chart = void 0;
      this._loop = void 0;
      this._fullLoop = void 0;
      this._path = void 0;
      this._points = void 0;
      this._segments = void 0;
      this._decimated = false;
      this._pointsUpdated = false;
      this._datasetIndex = void 0;
      if (cfg) {
        Object.assign(this, cfg);
      }
    }
    updateControlPoints(chartArea, indexAxis) {
      const options = this.options;
      if ((options.tension || options.cubicInterpolationMode === "monotone") && !options.stepped && !this._pointsUpdated) {
        const loop = options.spanGaps ? this._loop : this._fullLoop;
        _updateBezierControlPoints(this._points, options, chartArea, loop, indexAxis);
        this._pointsUpdated = true;
      }
    }
    set points(points) {
      this._points = points;
      delete this._segments;
      delete this._path;
      this._pointsUpdated = false;
    }
    get points() {
      return this._points;
    }
    get segments() {
      return this._segments || (this._segments = _computeSegments(this, this.options.segment));
    }
    first() {
      const segments = this.segments;
      const points = this.points;
      return segments.length && points[segments[0].start];
    }
    last() {
      const segments = this.segments;
      const points = this.points;
      const count = segments.length;
      return count && points[segments[count - 1].end];
    }
    interpolate(point, property) {
      const options = this.options;
      const value = point[property];
      const points = this.points;
      const segments = _boundSegments(this, { property, start: value, end: value });
      if (!segments.length) {
        return;
      }
      const result = [];
      const _interpolate = _getInterpolationMethod(options);
      let i4, ilen;
      for (i4 = 0, ilen = segments.length; i4 < ilen; ++i4) {
        const { start, end } = segments[i4];
        const p1 = points[start];
        const p2 = points[end];
        if (p1 === p2) {
          result.push(p1);
          continue;
        }
        const t4 = Math.abs((value - p1[property]) / (p2[property] - p1[property]));
        const interpolated = _interpolate(p1, p2, t4, options.stepped);
        interpolated[property] = point[property];
        result.push(interpolated);
      }
      return result.length === 1 ? result[0] : result;
    }
    pathSegment(ctx, segment, params) {
      const segmentMethod = _getSegmentMethod(this);
      return segmentMethod(ctx, this, segment, params);
    }
    path(ctx, start, count) {
      const segments = this.segments;
      const segmentMethod = _getSegmentMethod(this);
      let loop = this._loop;
      start = start || 0;
      count = count || this.points.length - start;
      for (const segment of segments) {
        loop &= segmentMethod(ctx, this, segment, { start, end: start + count - 1 });
      }
      return !!loop;
    }
    draw(ctx, chartArea, start, count) {
      const options = this.options || {};
      const points = this.points || [];
      if (points.length && options.borderWidth) {
        ctx.save();
        draw(ctx, this, start, count);
        ctx.restore();
      }
      if (this.animated) {
        this._pointsUpdated = false;
        this._path = void 0;
      }
    }
  };
  LineElement.id = "line";
  LineElement.defaults = {
    borderCapStyle: "butt",
    borderDash: [],
    borderDashOffset: 0,
    borderJoinStyle: "miter",
    borderWidth: 3,
    capBezierPoints: true,
    cubicInterpolationMode: "default",
    fill: false,
    spanGaps: false,
    stepped: false,
    tension: 0
  };
  LineElement.defaultRoutes = {
    backgroundColor: "backgroundColor",
    borderColor: "borderColor"
  };
  LineElement.descriptors = {
    _scriptable: true,
    _indexable: (name) => name !== "borderDash" && name !== "fill"
  };
  function inRange$1(el, pos, axis, useFinalPosition) {
    const options = el.options;
    const { [axis]: value } = el.getProps([axis], useFinalPosition);
    return Math.abs(pos - value) < options.radius + options.hitRadius;
  }
  var PointElement = class extends Element {
    constructor(cfg) {
      super();
      this.options = void 0;
      this.parsed = void 0;
      this.skip = void 0;
      this.stop = void 0;
      if (cfg) {
        Object.assign(this, cfg);
      }
    }
    inRange(mouseX, mouseY, useFinalPosition) {
      const options = this.options;
      const { x: x2, y: y2 } = this.getProps(["x", "y"], useFinalPosition);
      return Math.pow(mouseX - x2, 2) + Math.pow(mouseY - y2, 2) < Math.pow(options.hitRadius + options.radius, 2);
    }
    inXRange(mouseX, useFinalPosition) {
      return inRange$1(this, mouseX, "x", useFinalPosition);
    }
    inYRange(mouseY, useFinalPosition) {
      return inRange$1(this, mouseY, "y", useFinalPosition);
    }
    getCenterPoint(useFinalPosition) {
      const { x: x2, y: y2 } = this.getProps(["x", "y"], useFinalPosition);
      return { x: x2, y: y2 };
    }
    size(options) {
      options = options || this.options || {};
      let radius = options.radius || 0;
      radius = Math.max(radius, radius && options.hoverRadius || 0);
      const borderWidth = radius && options.borderWidth || 0;
      return (radius + borderWidth) * 2;
    }
    draw(ctx, area) {
      const options = this.options;
      if (this.skip || options.radius < 0.1 || !_isPointInArea(this, area, this.size(options) / 2)) {
        return;
      }
      ctx.strokeStyle = options.borderColor;
      ctx.lineWidth = options.borderWidth;
      ctx.fillStyle = options.backgroundColor;
      drawPoint(ctx, options, this.x, this.y);
    }
    getRange() {
      const options = this.options || {};
      return options.radius + options.hitRadius;
    }
  };
  PointElement.id = "point";
  PointElement.defaults = {
    borderWidth: 1,
    hitRadius: 1,
    hoverBorderWidth: 1,
    hoverRadius: 4,
    pointStyle: "circle",
    radius: 3,
    rotation: 0
  };
  PointElement.defaultRoutes = {
    backgroundColor: "backgroundColor",
    borderColor: "borderColor"
  };
  function getBarBounds(bar, useFinalPosition) {
    const { x: x2, y: y2, base, width, height } = bar.getProps(["x", "y", "base", "width", "height"], useFinalPosition);
    let left, right, top, bottom, half;
    if (bar.horizontal) {
      half = height / 2;
      left = Math.min(x2, base);
      right = Math.max(x2, base);
      top = y2 - half;
      bottom = y2 + half;
    } else {
      half = width / 2;
      left = x2 - half;
      right = x2 + half;
      top = Math.min(y2, base);
      bottom = Math.max(y2, base);
    }
    return { left, top, right, bottom };
  }
  function skipOrLimit(skip2, value, min, max) {
    return skip2 ? 0 : _limitValue(value, min, max);
  }
  function parseBorderWidth(bar, maxW, maxH) {
    const value = bar.options.borderWidth;
    const skip2 = bar.borderSkipped;
    const o4 = toTRBL(value);
    return {
      t: skipOrLimit(skip2.top, o4.top, 0, maxH),
      r: skipOrLimit(skip2.right, o4.right, 0, maxW),
      b: skipOrLimit(skip2.bottom, o4.bottom, 0, maxH),
      l: skipOrLimit(skip2.left, o4.left, 0, maxW)
    };
  }
  function parseBorderRadius(bar, maxW, maxH) {
    const { enableBorderRadius } = bar.getProps(["enableBorderRadius"]);
    const value = bar.options.borderRadius;
    const o4 = toTRBLCorners(value);
    const maxR = Math.min(maxW, maxH);
    const skip2 = bar.borderSkipped;
    const enableBorder = enableBorderRadius || isObject(value);
    return {
      topLeft: skipOrLimit(!enableBorder || skip2.top || skip2.left, o4.topLeft, 0, maxR),
      topRight: skipOrLimit(!enableBorder || skip2.top || skip2.right, o4.topRight, 0, maxR),
      bottomLeft: skipOrLimit(!enableBorder || skip2.bottom || skip2.left, o4.bottomLeft, 0, maxR),
      bottomRight: skipOrLimit(!enableBorder || skip2.bottom || skip2.right, o4.bottomRight, 0, maxR)
    };
  }
  function boundingRects(bar) {
    const bounds = getBarBounds(bar);
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    const border = parseBorderWidth(bar, width / 2, height / 2);
    const radius = parseBorderRadius(bar, width / 2, height / 2);
    return {
      outer: {
        x: bounds.left,
        y: bounds.top,
        w: width,
        h: height,
        radius
      },
      inner: {
        x: bounds.left + border.l,
        y: bounds.top + border.t,
        w: width - border.l - border.r,
        h: height - border.t - border.b,
        radius: {
          topLeft: Math.max(0, radius.topLeft - Math.max(border.t, border.l)),
          topRight: Math.max(0, radius.topRight - Math.max(border.t, border.r)),
          bottomLeft: Math.max(0, radius.bottomLeft - Math.max(border.b, border.l)),
          bottomRight: Math.max(0, radius.bottomRight - Math.max(border.b, border.r))
        }
      }
    };
  }
  function inRange(bar, x2, y2, useFinalPosition) {
    const skipX = x2 === null;
    const skipY = y2 === null;
    const skipBoth = skipX && skipY;
    const bounds = bar && !skipBoth && getBarBounds(bar, useFinalPosition);
    return bounds && (skipX || _isBetween(x2, bounds.left, bounds.right)) && (skipY || _isBetween(y2, bounds.top, bounds.bottom));
  }
  function hasRadius(radius) {
    return radius.topLeft || radius.topRight || radius.bottomLeft || radius.bottomRight;
  }
  function addNormalRectPath(ctx, rect) {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
  function inflateRect(rect, amount, refRect = {}) {
    const x2 = rect.x !== refRect.x ? -amount : 0;
    const y2 = rect.y !== refRect.y ? -amount : 0;
    const w2 = (rect.x + rect.w !== refRect.x + refRect.w ? amount : 0) - x2;
    const h3 = (rect.y + rect.h !== refRect.y + refRect.h ? amount : 0) - y2;
    return {
      x: rect.x + x2,
      y: rect.y + y2,
      w: rect.w + w2,
      h: rect.h + h3,
      radius: rect.radius
    };
  }
  var BarElement = class extends Element {
    constructor(cfg) {
      super();
      this.options = void 0;
      this.horizontal = void 0;
      this.base = void 0;
      this.width = void 0;
      this.height = void 0;
      this.inflateAmount = void 0;
      if (cfg) {
        Object.assign(this, cfg);
      }
    }
    draw(ctx) {
      const { inflateAmount, options: { borderColor, backgroundColor } } = this;
      const { inner, outer } = boundingRects(this);
      const addRectPath = hasRadius(outer.radius) ? addRoundedRectPath : addNormalRectPath;
      ctx.save();
      if (outer.w !== inner.w || outer.h !== inner.h) {
        ctx.beginPath();
        addRectPath(ctx, inflateRect(outer, inflateAmount, inner));
        ctx.clip();
        addRectPath(ctx, inflateRect(inner, -inflateAmount, outer));
        ctx.fillStyle = borderColor;
        ctx.fill("evenodd");
      }
      ctx.beginPath();
      addRectPath(ctx, inflateRect(inner, inflateAmount));
      ctx.fillStyle = backgroundColor;
      ctx.fill();
      ctx.restore();
    }
    inRange(mouseX, mouseY, useFinalPosition) {
      return inRange(this, mouseX, mouseY, useFinalPosition);
    }
    inXRange(mouseX, useFinalPosition) {
      return inRange(this, mouseX, null, useFinalPosition);
    }
    inYRange(mouseY, useFinalPosition) {
      return inRange(this, null, mouseY, useFinalPosition);
    }
    getCenterPoint(useFinalPosition) {
      const { x: x2, y: y2, base, horizontal } = this.getProps(["x", "y", "base", "horizontal"], useFinalPosition);
      return {
        x: horizontal ? (x2 + base) / 2 : x2,
        y: horizontal ? y2 : (y2 + base) / 2
      };
    }
    getRange(axis) {
      return axis === "x" ? this.width / 2 : this.height / 2;
    }
  };
  BarElement.id = "bar";
  BarElement.defaults = {
    borderSkipped: "start",
    borderWidth: 0,
    borderRadius: 0,
    inflateAmount: "auto",
    pointStyle: void 0
  };
  BarElement.defaultRoutes = {
    backgroundColor: "backgroundColor",
    borderColor: "borderColor"
  };
  var positioners = {
    average(items) {
      if (!items.length) {
        return false;
      }
      let i4, len;
      let x2 = 0;
      let y2 = 0;
      let count = 0;
      for (i4 = 0, len = items.length; i4 < len; ++i4) {
        const el = items[i4].element;
        if (el && el.hasValue()) {
          const pos = el.tooltipPosition();
          x2 += pos.x;
          y2 += pos.y;
          ++count;
        }
      }
      return {
        x: x2 / count,
        y: y2 / count
      };
    },
    nearest(items, eventPosition) {
      if (!items.length) {
        return false;
      }
      let x2 = eventPosition.x;
      let y2 = eventPosition.y;
      let minDistance = Number.POSITIVE_INFINITY;
      let i4, len, nearestElement;
      for (i4 = 0, len = items.length; i4 < len; ++i4) {
        const el = items[i4].element;
        if (el && el.hasValue()) {
          const center = el.getCenterPoint();
          const d2 = distanceBetweenPoints(eventPosition, center);
          if (d2 < minDistance) {
            minDistance = d2;
            nearestElement = el;
          }
        }
      }
      if (nearestElement) {
        const tp = nearestElement.tooltipPosition();
        x2 = tp.x;
        y2 = tp.y;
      }
      return {
        x: x2,
        y: y2
      };
    }
  };
  function pushOrConcat(base, toPush) {
    if (toPush) {
      if (isArray(toPush)) {
        Array.prototype.push.apply(base, toPush);
      } else {
        base.push(toPush);
      }
    }
    return base;
  }
  function splitNewlines(str) {
    if ((typeof str === "string" || str instanceof String) && str.indexOf("\n") > -1) {
      return str.split("\n");
    }
    return str;
  }
  function createTooltipItem(chart2, item) {
    const { element, datasetIndex, index } = item;
    const controller = chart2.getDatasetMeta(datasetIndex).controller;
    const { label, value } = controller.getLabelAndValue(index);
    return {
      chart: chart2,
      label,
      parsed: controller.getParsed(index),
      raw: chart2.data.datasets[datasetIndex].data[index],
      formattedValue: value,
      dataset: controller.getDataset(),
      dataIndex: index,
      datasetIndex,
      element
    };
  }
  function getTooltipSize(tooltip, options) {
    const ctx = tooltip.chart.ctx;
    const { body, footer, title } = tooltip;
    const { boxWidth, boxHeight } = options;
    const bodyFont = toFont(options.bodyFont);
    const titleFont = toFont(options.titleFont);
    const footerFont = toFont(options.footerFont);
    const titleLineCount = title.length;
    const footerLineCount = footer.length;
    const bodyLineItemCount = body.length;
    const padding = toPadding(options.padding);
    let height = padding.height;
    let width = 0;
    let combinedBodyLength = body.reduce((count, bodyItem) => count + bodyItem.before.length + bodyItem.lines.length + bodyItem.after.length, 0);
    combinedBodyLength += tooltip.beforeBody.length + tooltip.afterBody.length;
    if (titleLineCount) {
      height += titleLineCount * titleFont.lineHeight + (titleLineCount - 1) * options.titleSpacing + options.titleMarginBottom;
    }
    if (combinedBodyLength) {
      const bodyLineHeight = options.displayColors ? Math.max(boxHeight, bodyFont.lineHeight) : bodyFont.lineHeight;
      height += bodyLineItemCount * bodyLineHeight + (combinedBodyLength - bodyLineItemCount) * bodyFont.lineHeight + (combinedBodyLength - 1) * options.bodySpacing;
    }
    if (footerLineCount) {
      height += options.footerMarginTop + footerLineCount * footerFont.lineHeight + (footerLineCount - 1) * options.footerSpacing;
    }
    let widthPadding = 0;
    const maxLineWidth = function(line) {
      width = Math.max(width, ctx.measureText(line).width + widthPadding);
    };
    ctx.save();
    ctx.font = titleFont.string;
    each(tooltip.title, maxLineWidth);
    ctx.font = bodyFont.string;
    each(tooltip.beforeBody.concat(tooltip.afterBody), maxLineWidth);
    widthPadding = options.displayColors ? boxWidth + 2 + options.boxPadding : 0;
    each(body, (bodyItem) => {
      each(bodyItem.before, maxLineWidth);
      each(bodyItem.lines, maxLineWidth);
      each(bodyItem.after, maxLineWidth);
    });
    widthPadding = 0;
    ctx.font = footerFont.string;
    each(tooltip.footer, maxLineWidth);
    ctx.restore();
    width += padding.width;
    return { width, height };
  }
  function determineYAlign(chart2, size) {
    const { y: y2, height } = size;
    if (y2 < height / 2) {
      return "top";
    } else if (y2 > chart2.height - height / 2) {
      return "bottom";
    }
    return "center";
  }
  function doesNotFitWithAlign(xAlign, chart2, options, size) {
    const { x: x2, width } = size;
    const caret = options.caretSize + options.caretPadding;
    if (xAlign === "left" && x2 + width + caret > chart2.width) {
      return true;
    }
    if (xAlign === "right" && x2 - width - caret < 0) {
      return true;
    }
  }
  function determineXAlign(chart2, options, size, yAlign) {
    const { x: x2, width } = size;
    const { width: chartWidth, chartArea: { left, right } } = chart2;
    let xAlign = "center";
    if (yAlign === "center") {
      xAlign = x2 <= (left + right) / 2 ? "left" : "right";
    } else if (x2 <= width / 2) {
      xAlign = "left";
    } else if (x2 >= chartWidth - width / 2) {
      xAlign = "right";
    }
    if (doesNotFitWithAlign(xAlign, chart2, options, size)) {
      xAlign = "center";
    }
    return xAlign;
  }
  function determineAlignment(chart2, options, size) {
    const yAlign = size.yAlign || options.yAlign || determineYAlign(chart2, size);
    return {
      xAlign: size.xAlign || options.xAlign || determineXAlign(chart2, options, size, yAlign),
      yAlign
    };
  }
  function alignX(size, xAlign) {
    let { x: x2, width } = size;
    if (xAlign === "right") {
      x2 -= width;
    } else if (xAlign === "center") {
      x2 -= width / 2;
    }
    return x2;
  }
  function alignY(size, yAlign, paddingAndSize) {
    let { y: y2, height } = size;
    if (yAlign === "top") {
      y2 += paddingAndSize;
    } else if (yAlign === "bottom") {
      y2 -= height + paddingAndSize;
    } else {
      y2 -= height / 2;
    }
    return y2;
  }
  function getBackgroundPoint(options, size, alignment, chart2) {
    const { caretSize, caretPadding, cornerRadius } = options;
    const { xAlign, yAlign } = alignment;
    const paddingAndSize = caretSize + caretPadding;
    const { topLeft, topRight, bottomLeft, bottomRight } = toTRBLCorners(cornerRadius);
    let x2 = alignX(size, xAlign);
    const y2 = alignY(size, yAlign, paddingAndSize);
    if (yAlign === "center") {
      if (xAlign === "left") {
        x2 += paddingAndSize;
      } else if (xAlign === "right") {
        x2 -= paddingAndSize;
      }
    } else if (xAlign === "left") {
      x2 -= Math.max(topLeft, bottomLeft) + caretSize;
    } else if (xAlign === "right") {
      x2 += Math.max(topRight, bottomRight) + caretSize;
    }
    return {
      x: _limitValue(x2, 0, chart2.width - size.width),
      y: _limitValue(y2, 0, chart2.height - size.height)
    };
  }
  function getAlignedX(tooltip, align, options) {
    const padding = toPadding(options.padding);
    return align === "center" ? tooltip.x + tooltip.width / 2 : align === "right" ? tooltip.x + tooltip.width - padding.right : tooltip.x + padding.left;
  }
  function getBeforeAfterBodyLines(callback2) {
    return pushOrConcat([], splitNewlines(callback2));
  }
  function createTooltipContext(parent, tooltip, tooltipItems) {
    return createContext(parent, {
      tooltip,
      tooltipItems,
      type: "tooltip"
    });
  }
  function overrideCallbacks(callbacks, context) {
    const override = context && context.dataset && context.dataset.tooltip && context.dataset.tooltip.callbacks;
    return override ? callbacks.override(override) : callbacks;
  }
  var Tooltip = class extends Element {
    constructor(config) {
      super();
      this.opacity = 0;
      this._active = [];
      this._eventPosition = void 0;
      this._size = void 0;
      this._cachedAnimations = void 0;
      this._tooltipItems = [];
      this.$animations = void 0;
      this.$context = void 0;
      this.chart = config.chart || config._chart;
      this._chart = this.chart;
      this.options = config.options;
      this.dataPoints = void 0;
      this.title = void 0;
      this.beforeBody = void 0;
      this.body = void 0;
      this.afterBody = void 0;
      this.footer = void 0;
      this.xAlign = void 0;
      this.yAlign = void 0;
      this.x = void 0;
      this.y = void 0;
      this.height = void 0;
      this.width = void 0;
      this.caretX = void 0;
      this.caretY = void 0;
      this.labelColors = void 0;
      this.labelPointStyles = void 0;
      this.labelTextColors = void 0;
    }
    initialize(options) {
      this.options = options;
      this._cachedAnimations = void 0;
      this.$context = void 0;
    }
    _resolveAnimations() {
      const cached = this._cachedAnimations;
      if (cached) {
        return cached;
      }
      const chart2 = this.chart;
      const options = this.options.setContext(this.getContext());
      const opts = options.enabled && chart2.options.animation && options.animations;
      const animations = new Animations(this.chart, opts);
      if (opts._cacheable) {
        this._cachedAnimations = Object.freeze(animations);
      }
      return animations;
    }
    getContext() {
      return this.$context || (this.$context = createTooltipContext(this.chart.getContext(), this, this._tooltipItems));
    }
    getTitle(context, options) {
      const { callbacks } = options;
      const beforeTitle = callbacks.beforeTitle.apply(this, [context]);
      const title = callbacks.title.apply(this, [context]);
      const afterTitle = callbacks.afterTitle.apply(this, [context]);
      let lines = [];
      lines = pushOrConcat(lines, splitNewlines(beforeTitle));
      lines = pushOrConcat(lines, splitNewlines(title));
      lines = pushOrConcat(lines, splitNewlines(afterTitle));
      return lines;
    }
    getBeforeBody(tooltipItems, options) {
      return getBeforeAfterBodyLines(options.callbacks.beforeBody.apply(this, [tooltipItems]));
    }
    getBody(tooltipItems, options) {
      const { callbacks } = options;
      const bodyItems = [];
      each(tooltipItems, (context) => {
        const bodyItem = {
          before: [],
          lines: [],
          after: []
        };
        const scoped = overrideCallbacks(callbacks, context);
        pushOrConcat(bodyItem.before, splitNewlines(scoped.beforeLabel.call(this, context)));
        pushOrConcat(bodyItem.lines, scoped.label.call(this, context));
        pushOrConcat(bodyItem.after, splitNewlines(scoped.afterLabel.call(this, context)));
        bodyItems.push(bodyItem);
      });
      return bodyItems;
    }
    getAfterBody(tooltipItems, options) {
      return getBeforeAfterBodyLines(options.callbacks.afterBody.apply(this, [tooltipItems]));
    }
    getFooter(tooltipItems, options) {
      const { callbacks } = options;
      const beforeFooter = callbacks.beforeFooter.apply(this, [tooltipItems]);
      const footer = callbacks.footer.apply(this, [tooltipItems]);
      const afterFooter = callbacks.afterFooter.apply(this, [tooltipItems]);
      let lines = [];
      lines = pushOrConcat(lines, splitNewlines(beforeFooter));
      lines = pushOrConcat(lines, splitNewlines(footer));
      lines = pushOrConcat(lines, splitNewlines(afterFooter));
      return lines;
    }
    _createItems(options) {
      const active = this._active;
      const data = this.chart.data;
      const labelColors = [];
      const labelPointStyles = [];
      const labelTextColors = [];
      let tooltipItems = [];
      let i4, len;
      for (i4 = 0, len = active.length; i4 < len; ++i4) {
        tooltipItems.push(createTooltipItem(this.chart, active[i4]));
      }
      if (options.filter) {
        tooltipItems = tooltipItems.filter((element, index, array) => options.filter(element, index, array, data));
      }
      if (options.itemSort) {
        tooltipItems = tooltipItems.sort((a3, b2) => options.itemSort(a3, b2, data));
      }
      each(tooltipItems, (context) => {
        const scoped = overrideCallbacks(options.callbacks, context);
        labelColors.push(scoped.labelColor.call(this, context));
        labelPointStyles.push(scoped.labelPointStyle.call(this, context));
        labelTextColors.push(scoped.labelTextColor.call(this, context));
      });
      this.labelColors = labelColors;
      this.labelPointStyles = labelPointStyles;
      this.labelTextColors = labelTextColors;
      this.dataPoints = tooltipItems;
      return tooltipItems;
    }
    update(changed, replay) {
      const options = this.options.setContext(this.getContext());
      const active = this._active;
      let properties;
      let tooltipItems = [];
      if (!active.length) {
        if (this.opacity !== 0) {
          properties = {
            opacity: 0
          };
        }
      } else {
        const position = positioners[options.position].call(this, active, this._eventPosition);
        tooltipItems = this._createItems(options);
        this.title = this.getTitle(tooltipItems, options);
        this.beforeBody = this.getBeforeBody(tooltipItems, options);
        this.body = this.getBody(tooltipItems, options);
        this.afterBody = this.getAfterBody(tooltipItems, options);
        this.footer = this.getFooter(tooltipItems, options);
        const size = this._size = getTooltipSize(this, options);
        const positionAndSize = Object.assign({}, position, size);
        const alignment = determineAlignment(this.chart, options, positionAndSize);
        const backgroundPoint = getBackgroundPoint(options, positionAndSize, alignment, this.chart);
        this.xAlign = alignment.xAlign;
        this.yAlign = alignment.yAlign;
        properties = {
          opacity: 1,
          x: backgroundPoint.x,
          y: backgroundPoint.y,
          width: size.width,
          height: size.height,
          caretX: position.x,
          caretY: position.y
        };
      }
      this._tooltipItems = tooltipItems;
      this.$context = void 0;
      if (properties) {
        this._resolveAnimations().update(this, properties);
      }
      if (changed && options.external) {
        options.external.call(this, { chart: this.chart, tooltip: this, replay });
      }
    }
    drawCaret(tooltipPoint, ctx, size, options) {
      const caretPosition = this.getCaretPosition(tooltipPoint, size, options);
      ctx.lineTo(caretPosition.x1, caretPosition.y1);
      ctx.lineTo(caretPosition.x2, caretPosition.y2);
      ctx.lineTo(caretPosition.x3, caretPosition.y3);
    }
    getCaretPosition(tooltipPoint, size, options) {
      const { xAlign, yAlign } = this;
      const { caretSize, cornerRadius } = options;
      const { topLeft, topRight, bottomLeft, bottomRight } = toTRBLCorners(cornerRadius);
      const { x: ptX, y: ptY } = tooltipPoint;
      const { width, height } = size;
      let x1, x2, x3, y1, y2, y3;
      if (yAlign === "center") {
        y2 = ptY + height / 2;
        if (xAlign === "left") {
          x1 = ptX;
          x2 = x1 - caretSize;
          y1 = y2 + caretSize;
          y3 = y2 - caretSize;
        } else {
          x1 = ptX + width;
          x2 = x1 + caretSize;
          y1 = y2 - caretSize;
          y3 = y2 + caretSize;
        }
        x3 = x1;
      } else {
        if (xAlign === "left") {
          x2 = ptX + Math.max(topLeft, bottomLeft) + caretSize;
        } else if (xAlign === "right") {
          x2 = ptX + width - Math.max(topRight, bottomRight) - caretSize;
        } else {
          x2 = this.caretX;
        }
        if (yAlign === "top") {
          y1 = ptY;
          y2 = y1 - caretSize;
          x1 = x2 - caretSize;
          x3 = x2 + caretSize;
        } else {
          y1 = ptY + height;
          y2 = y1 + caretSize;
          x1 = x2 + caretSize;
          x3 = x2 - caretSize;
        }
        y3 = y1;
      }
      return { x1, x2, x3, y1, y2, y3 };
    }
    drawTitle(pt, ctx, options) {
      const title = this.title;
      const length = title.length;
      let titleFont, titleSpacing, i4;
      if (length) {
        const rtlHelper = getRtlAdapter(options.rtl, this.x, this.width);
        pt.x = getAlignedX(this, options.titleAlign, options);
        ctx.textAlign = rtlHelper.textAlign(options.titleAlign);
        ctx.textBaseline = "middle";
        titleFont = toFont(options.titleFont);
        titleSpacing = options.titleSpacing;
        ctx.fillStyle = options.titleColor;
        ctx.font = titleFont.string;
        for (i4 = 0; i4 < length; ++i4) {
          ctx.fillText(title[i4], rtlHelper.x(pt.x), pt.y + titleFont.lineHeight / 2);
          pt.y += titleFont.lineHeight + titleSpacing;
          if (i4 + 1 === length) {
            pt.y += options.titleMarginBottom - titleSpacing;
          }
        }
      }
    }
    _drawColorBox(ctx, pt, i4, rtlHelper, options) {
      const labelColors = this.labelColors[i4];
      const labelPointStyle = this.labelPointStyles[i4];
      const { boxHeight, boxWidth, boxPadding } = options;
      const bodyFont = toFont(options.bodyFont);
      const colorX = getAlignedX(this, "left", options);
      const rtlColorX = rtlHelper.x(colorX);
      const yOffSet = boxHeight < bodyFont.lineHeight ? (bodyFont.lineHeight - boxHeight) / 2 : 0;
      const colorY = pt.y + yOffSet;
      if (options.usePointStyle) {
        const drawOptions = {
          radius: Math.min(boxWidth, boxHeight) / 2,
          pointStyle: labelPointStyle.pointStyle,
          rotation: labelPointStyle.rotation,
          borderWidth: 1
        };
        const centerX = rtlHelper.leftForLtr(rtlColorX, boxWidth) + boxWidth / 2;
        const centerY = colorY + boxHeight / 2;
        ctx.strokeStyle = options.multiKeyBackground;
        ctx.fillStyle = options.multiKeyBackground;
        drawPoint(ctx, drawOptions, centerX, centerY);
        ctx.strokeStyle = labelColors.borderColor;
        ctx.fillStyle = labelColors.backgroundColor;
        drawPoint(ctx, drawOptions, centerX, centerY);
      } else {
        ctx.lineWidth = labelColors.borderWidth || 1;
        ctx.strokeStyle = labelColors.borderColor;
        ctx.setLineDash(labelColors.borderDash || []);
        ctx.lineDashOffset = labelColors.borderDashOffset || 0;
        const outerX = rtlHelper.leftForLtr(rtlColorX, boxWidth - boxPadding);
        const innerX = rtlHelper.leftForLtr(rtlHelper.xPlus(rtlColorX, 1), boxWidth - boxPadding - 2);
        const borderRadius = toTRBLCorners(labelColors.borderRadius);
        if (Object.values(borderRadius).some((v2) => v2 !== 0)) {
          ctx.beginPath();
          ctx.fillStyle = options.multiKeyBackground;
          addRoundedRectPath(ctx, {
            x: outerX,
            y: colorY,
            w: boxWidth,
            h: boxHeight,
            radius: borderRadius
          });
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = labelColors.backgroundColor;
          ctx.beginPath();
          addRoundedRectPath(ctx, {
            x: innerX,
            y: colorY + 1,
            w: boxWidth - 2,
            h: boxHeight - 2,
            radius: borderRadius
          });
          ctx.fill();
        } else {
          ctx.fillStyle = options.multiKeyBackground;
          ctx.fillRect(outerX, colorY, boxWidth, boxHeight);
          ctx.strokeRect(outerX, colorY, boxWidth, boxHeight);
          ctx.fillStyle = labelColors.backgroundColor;
          ctx.fillRect(innerX, colorY + 1, boxWidth - 2, boxHeight - 2);
        }
      }
      ctx.fillStyle = this.labelTextColors[i4];
    }
    drawBody(pt, ctx, options) {
      const { body } = this;
      const { bodySpacing, bodyAlign, displayColors, boxHeight, boxWidth, boxPadding } = options;
      const bodyFont = toFont(options.bodyFont);
      let bodyLineHeight = bodyFont.lineHeight;
      let xLinePadding = 0;
      const rtlHelper = getRtlAdapter(options.rtl, this.x, this.width);
      const fillLineOfText = function(line) {
        ctx.fillText(line, rtlHelper.x(pt.x + xLinePadding), pt.y + bodyLineHeight / 2);
        pt.y += bodyLineHeight + bodySpacing;
      };
      const bodyAlignForCalculation = rtlHelper.textAlign(bodyAlign);
      let bodyItem, textColor, lines, i4, j, ilen, jlen;
      ctx.textAlign = bodyAlign;
      ctx.textBaseline = "middle";
      ctx.font = bodyFont.string;
      pt.x = getAlignedX(this, bodyAlignForCalculation, options);
      ctx.fillStyle = options.bodyColor;
      each(this.beforeBody, fillLineOfText);
      xLinePadding = displayColors && bodyAlignForCalculation !== "right" ? bodyAlign === "center" ? boxWidth / 2 + boxPadding : boxWidth + 2 + boxPadding : 0;
      for (i4 = 0, ilen = body.length; i4 < ilen; ++i4) {
        bodyItem = body[i4];
        textColor = this.labelTextColors[i4];
        ctx.fillStyle = textColor;
        each(bodyItem.before, fillLineOfText);
        lines = bodyItem.lines;
        if (displayColors && lines.length) {
          this._drawColorBox(ctx, pt, i4, rtlHelper, options);
          bodyLineHeight = Math.max(bodyFont.lineHeight, boxHeight);
        }
        for (j = 0, jlen = lines.length; j < jlen; ++j) {
          fillLineOfText(lines[j]);
          bodyLineHeight = bodyFont.lineHeight;
        }
        each(bodyItem.after, fillLineOfText);
      }
      xLinePadding = 0;
      bodyLineHeight = bodyFont.lineHeight;
      each(this.afterBody, fillLineOfText);
      pt.y -= bodySpacing;
    }
    drawFooter(pt, ctx, options) {
      const footer = this.footer;
      const length = footer.length;
      let footerFont, i4;
      if (length) {
        const rtlHelper = getRtlAdapter(options.rtl, this.x, this.width);
        pt.x = getAlignedX(this, options.footerAlign, options);
        pt.y += options.footerMarginTop;
        ctx.textAlign = rtlHelper.textAlign(options.footerAlign);
        ctx.textBaseline = "middle";
        footerFont = toFont(options.footerFont);
        ctx.fillStyle = options.footerColor;
        ctx.font = footerFont.string;
        for (i4 = 0; i4 < length; ++i4) {
          ctx.fillText(footer[i4], rtlHelper.x(pt.x), pt.y + footerFont.lineHeight / 2);
          pt.y += footerFont.lineHeight + options.footerSpacing;
        }
      }
    }
    drawBackground(pt, ctx, tooltipSize, options) {
      const { xAlign, yAlign } = this;
      const { x: x2, y: y2 } = pt;
      const { width, height } = tooltipSize;
      const { topLeft, topRight, bottomLeft, bottomRight } = toTRBLCorners(options.cornerRadius);
      ctx.fillStyle = options.backgroundColor;
      ctx.strokeStyle = options.borderColor;
      ctx.lineWidth = options.borderWidth;
      ctx.beginPath();
      ctx.moveTo(x2 + topLeft, y2);
      if (yAlign === "top") {
        this.drawCaret(pt, ctx, tooltipSize, options);
      }
      ctx.lineTo(x2 + width - topRight, y2);
      ctx.quadraticCurveTo(x2 + width, y2, x2 + width, y2 + topRight);
      if (yAlign === "center" && xAlign === "right") {
        this.drawCaret(pt, ctx, tooltipSize, options);
      }
      ctx.lineTo(x2 + width, y2 + height - bottomRight);
      ctx.quadraticCurveTo(x2 + width, y2 + height, x2 + width - bottomRight, y2 + height);
      if (yAlign === "bottom") {
        this.drawCaret(pt, ctx, tooltipSize, options);
      }
      ctx.lineTo(x2 + bottomLeft, y2 + height);
      ctx.quadraticCurveTo(x2, y2 + height, x2, y2 + height - bottomLeft);
      if (yAlign === "center" && xAlign === "left") {
        this.drawCaret(pt, ctx, tooltipSize, options);
      }
      ctx.lineTo(x2, y2 + topLeft);
      ctx.quadraticCurveTo(x2, y2, x2 + topLeft, y2);
      ctx.closePath();
      ctx.fill();
      if (options.borderWidth > 0) {
        ctx.stroke();
      }
    }
    _updateAnimationTarget(options) {
      const chart2 = this.chart;
      const anims = this.$animations;
      const animX = anims && anims.x;
      const animY = anims && anims.y;
      if (animX || animY) {
        const position = positioners[options.position].call(this, this._active, this._eventPosition);
        if (!position) {
          return;
        }
        const size = this._size = getTooltipSize(this, options);
        const positionAndSize = Object.assign({}, position, this._size);
        const alignment = determineAlignment(chart2, options, positionAndSize);
        const point = getBackgroundPoint(options, positionAndSize, alignment, chart2);
        if (animX._to !== point.x || animY._to !== point.y) {
          this.xAlign = alignment.xAlign;
          this.yAlign = alignment.yAlign;
          this.width = size.width;
          this.height = size.height;
          this.caretX = position.x;
          this.caretY = position.y;
          this._resolveAnimations().update(this, point);
        }
      }
    }
    draw(ctx) {
      const options = this.options.setContext(this.getContext());
      let opacity = this.opacity;
      if (!opacity) {
        return;
      }
      this._updateAnimationTarget(options);
      const tooltipSize = {
        width: this.width,
        height: this.height
      };
      const pt = {
        x: this.x,
        y: this.y
      };
      opacity = Math.abs(opacity) < 1e-3 ? 0 : opacity;
      const padding = toPadding(options.padding);
      const hasTooltipContent = this.title.length || this.beforeBody.length || this.body.length || this.afterBody.length || this.footer.length;
      if (options.enabled && hasTooltipContent) {
        ctx.save();
        ctx.globalAlpha = opacity;
        this.drawBackground(pt, ctx, tooltipSize, options);
        overrideTextDirection(ctx, options.textDirection);
        pt.y += padding.top;
        this.drawTitle(pt, ctx, options);
        this.drawBody(pt, ctx, options);
        this.drawFooter(pt, ctx, options);
        restoreTextDirection(ctx, options.textDirection);
        ctx.restore();
      }
    }
    getActiveElements() {
      return this._active || [];
    }
    setActiveElements(activeElements, eventPosition) {
      const lastActive = this._active;
      const active = activeElements.map(({ datasetIndex, index }) => {
        const meta = this.chart.getDatasetMeta(datasetIndex);
        if (!meta) {
          throw new Error("Cannot find a dataset at index " + datasetIndex);
        }
        return {
          datasetIndex,
          element: meta.data[index],
          index
        };
      });
      const changed = !_elementsEqual(lastActive, active);
      const positionChanged = this._positionChanged(active, eventPosition);
      if (changed || positionChanged) {
        this._active = active;
        this._eventPosition = eventPosition;
        this._ignoreReplayEvents = true;
        this.update(true);
      }
    }
    handleEvent(e5, replay, inChartArea = true) {
      if (replay && this._ignoreReplayEvents) {
        return false;
      }
      this._ignoreReplayEvents = false;
      const options = this.options;
      const lastActive = this._active || [];
      const active = this._getActiveElements(e5, lastActive, replay, inChartArea);
      const positionChanged = this._positionChanged(active, e5);
      const changed = replay || !_elementsEqual(active, lastActive) || positionChanged;
      if (changed) {
        this._active = active;
        if (options.enabled || options.external) {
          this._eventPosition = {
            x: e5.x,
            y: e5.y
          };
          this.update(true, replay);
        }
      }
      return changed;
    }
    _getActiveElements(e5, lastActive, replay, inChartArea) {
      const options = this.options;
      if (e5.type === "mouseout") {
        return [];
      }
      if (!inChartArea) {
        return lastActive;
      }
      const active = this.chart.getElementsAtEventForMode(e5, options.mode, options, replay);
      if (options.reverse) {
        active.reverse();
      }
      return active;
    }
    _positionChanged(active, e5) {
      const { caretX, caretY, options } = this;
      const position = positioners[options.position].call(this, active, e5);
      return position !== false && (caretX !== position.x || caretY !== position.y);
    }
  };
  Tooltip.positioners = positioners;
  var plugin_tooltip = {
    id: "tooltip",
    _element: Tooltip,
    positioners,
    afterInit(chart2, _args, options) {
      if (options) {
        chart2.tooltip = new Tooltip({ chart: chart2, options });
      }
    },
    beforeUpdate(chart2, _args, options) {
      if (chart2.tooltip) {
        chart2.tooltip.initialize(options);
      }
    },
    reset(chart2, _args, options) {
      if (chart2.tooltip) {
        chart2.tooltip.initialize(options);
      }
    },
    afterDraw(chart2) {
      const tooltip = chart2.tooltip;
      const args = {
        tooltip
      };
      if (chart2.notifyPlugins("beforeTooltipDraw", args) === false) {
        return;
      }
      if (tooltip) {
        tooltip.draw(chart2.ctx);
      }
      chart2.notifyPlugins("afterTooltipDraw", args);
    },
    afterEvent(chart2, args) {
      if (chart2.tooltip) {
        const useFinalPosition = args.replay;
        if (chart2.tooltip.handleEvent(args.event, useFinalPosition, args.inChartArea)) {
          args.changed = true;
        }
      }
    },
    defaults: {
      enabled: true,
      external: null,
      position: "average",
      backgroundColor: "rgba(0,0,0,0.8)",
      titleColor: "#fff",
      titleFont: {
        weight: "bold"
      },
      titleSpacing: 2,
      titleMarginBottom: 6,
      titleAlign: "left",
      bodyColor: "#fff",
      bodySpacing: 2,
      bodyFont: {},
      bodyAlign: "left",
      footerColor: "#fff",
      footerSpacing: 2,
      footerMarginTop: 6,
      footerFont: {
        weight: "bold"
      },
      footerAlign: "left",
      padding: 6,
      caretPadding: 2,
      caretSize: 5,
      cornerRadius: 6,
      boxHeight: (ctx, opts) => opts.bodyFont.size,
      boxWidth: (ctx, opts) => opts.bodyFont.size,
      multiKeyBackground: "#fff",
      displayColors: true,
      boxPadding: 0,
      borderColor: "rgba(0,0,0,0)",
      borderWidth: 0,
      animation: {
        duration: 400,
        easing: "easeOutQuart"
      },
      animations: {
        numbers: {
          type: "number",
          properties: ["x", "y", "width", "height", "caretX", "caretY"]
        },
        opacity: {
          easing: "linear",
          duration: 200
        }
      },
      callbacks: {
        beforeTitle: noop,
        title(tooltipItems) {
          if (tooltipItems.length > 0) {
            const item = tooltipItems[0];
            const labels = item.chart.data.labels;
            const labelCount = labels ? labels.length : 0;
            if (this && this.options && this.options.mode === "dataset") {
              return item.dataset.label || "";
            } else if (item.label) {
              return item.label;
            } else if (labelCount > 0 && item.dataIndex < labelCount) {
              return labels[item.dataIndex];
            }
          }
          return "";
        },
        afterTitle: noop,
        beforeBody: noop,
        beforeLabel: noop,
        label(tooltipItem) {
          if (this && this.options && this.options.mode === "dataset") {
            return tooltipItem.label + ": " + tooltipItem.formattedValue || tooltipItem.formattedValue;
          }
          let label = tooltipItem.dataset.label || "";
          if (label) {
            label += ": ";
          }
          const value = tooltipItem.formattedValue;
          if (!isNullOrUndef(value)) {
            label += value;
          }
          return label;
        },
        labelColor(tooltipItem) {
          const meta = tooltipItem.chart.getDatasetMeta(tooltipItem.datasetIndex);
          const options = meta.controller.getStyle(tooltipItem.dataIndex);
          return {
            borderColor: options.borderColor,
            backgroundColor: options.backgroundColor,
            borderWidth: options.borderWidth,
            borderDash: options.borderDash,
            borderDashOffset: options.borderDashOffset,
            borderRadius: 0
          };
        },
        labelTextColor() {
          return this.options.bodyColor;
        },
        labelPointStyle(tooltipItem) {
          const meta = tooltipItem.chart.getDatasetMeta(tooltipItem.datasetIndex);
          const options = meta.controller.getStyle(tooltipItem.dataIndex);
          return {
            pointStyle: options.pointStyle,
            rotation: options.rotation
          };
        },
        afterLabel: noop,
        afterBody: noop,
        beforeFooter: noop,
        footer: noop,
        afterFooter: noop
      }
    },
    defaultRoutes: {
      bodyFont: "font",
      footerFont: "font",
      titleFont: "font"
    },
    descriptors: {
      _scriptable: (name) => name !== "filter" && name !== "itemSort" && name !== "external",
      _indexable: false,
      callbacks: {
        _scriptable: false,
        _indexable: false
      },
      animation: {
        _fallback: false
      },
      animations: {
        _fallback: "animation"
      }
    },
    additionalOptionScopes: ["interaction"]
  };
  var addIfString = (labels, raw, index, addedLabels) => {
    if (typeof raw === "string") {
      index = labels.push(raw) - 1;
      addedLabels.unshift({ index, label: raw });
    } else if (isNaN(raw)) {
      index = null;
    }
    return index;
  };
  function findOrAddLabel(labels, raw, index, addedLabels) {
    const first = labels.indexOf(raw);
    if (first === -1) {
      return addIfString(labels, raw, index, addedLabels);
    }
    const last = labels.lastIndexOf(raw);
    return first !== last ? index : first;
  }
  var validIndex = (index, max) => index === null ? null : _limitValue(Math.round(index), 0, max);
  var CategoryScale = class extends Scale {
    constructor(cfg) {
      super(cfg);
      this._startValue = void 0;
      this._valueRange = 0;
      this._addedLabels = [];
    }
    init(scaleOptions) {
      const added = this._addedLabels;
      if (added.length) {
        const labels = this.getLabels();
        for (const { index, label } of added) {
          if (labels[index] === label) {
            labels.splice(index, 1);
          }
        }
        this._addedLabels = [];
      }
      super.init(scaleOptions);
    }
    parse(raw, index) {
      if (isNullOrUndef(raw)) {
        return null;
      }
      const labels = this.getLabels();
      index = isFinite(index) && labels[index] === raw ? index : findOrAddLabel(labels, raw, valueOrDefault(index, raw), this._addedLabels);
      return validIndex(index, labels.length - 1);
    }
    determineDataLimits() {
      const { minDefined, maxDefined } = this.getUserBounds();
      let { min, max } = this.getMinMax(true);
      if (this.options.bounds === "ticks") {
        if (!minDefined) {
          min = 0;
        }
        if (!maxDefined) {
          max = this.getLabels().length - 1;
        }
      }
      this.min = min;
      this.max = max;
    }
    buildTicks() {
      const min = this.min;
      const max = this.max;
      const offset = this.options.offset;
      const ticks = [];
      let labels = this.getLabels();
      labels = min === 0 && max === labels.length - 1 ? labels : labels.slice(min, max + 1);
      this._valueRange = Math.max(labels.length - (offset ? 0 : 1), 1);
      this._startValue = this.min - (offset ? 0.5 : 0);
      for (let value = min; value <= max; value++) {
        ticks.push({ value });
      }
      return ticks;
    }
    getLabelForValue(value) {
      const labels = this.getLabels();
      if (value >= 0 && value < labels.length) {
        return labels[value];
      }
      return value;
    }
    configure() {
      super.configure();
      if (!this.isHorizontal()) {
        this._reversePixels = !this._reversePixels;
      }
    }
    getPixelForValue(value) {
      if (typeof value !== "number") {
        value = this.parse(value);
      }
      return value === null ? NaN : this.getPixelForDecimal((value - this._startValue) / this._valueRange);
    }
    getPixelForTick(index) {
      const ticks = this.ticks;
      if (index < 0 || index > ticks.length - 1) {
        return null;
      }
      return this.getPixelForValue(ticks[index].value);
    }
    getValueForPixel(pixel) {
      return Math.round(this._startValue + this.getDecimalForPixel(pixel) * this._valueRange);
    }
    getBasePixel() {
      return this.bottom;
    }
  };
  CategoryScale.id = "category";
  CategoryScale.defaults = {
    ticks: {
      callback: CategoryScale.prototype.getLabelForValue
    }
  };
  function generateTicks$1(generationOptions, dataRange) {
    const ticks = [];
    const MIN_SPACING = 1e-14;
    const { bounds, step, min, max, precision, count, maxTicks, maxDigits, includeBounds } = generationOptions;
    const unit = step || 1;
    const maxSpaces = maxTicks - 1;
    const { min: rmin, max: rmax } = dataRange;
    const minDefined = !isNullOrUndef(min);
    const maxDefined = !isNullOrUndef(max);
    const countDefined = !isNullOrUndef(count);
    const minSpacing = (rmax - rmin) / (maxDigits + 1);
    let spacing = niceNum((rmax - rmin) / maxSpaces / unit) * unit;
    let factor, niceMin, niceMax, numSpaces;
    if (spacing < MIN_SPACING && !minDefined && !maxDefined) {
      return [{ value: rmin }, { value: rmax }];
    }
    numSpaces = Math.ceil(rmax / spacing) - Math.floor(rmin / spacing);
    if (numSpaces > maxSpaces) {
      spacing = niceNum(numSpaces * spacing / maxSpaces / unit) * unit;
    }
    if (!isNullOrUndef(precision)) {
      factor = Math.pow(10, precision);
      spacing = Math.ceil(spacing * factor) / factor;
    }
    if (bounds === "ticks") {
      niceMin = Math.floor(rmin / spacing) * spacing;
      niceMax = Math.ceil(rmax / spacing) * spacing;
    } else {
      niceMin = rmin;
      niceMax = rmax;
    }
    if (minDefined && maxDefined && step && almostWhole((max - min) / step, spacing / 1e3)) {
      numSpaces = Math.round(Math.min((max - min) / spacing, maxTicks));
      spacing = (max - min) / numSpaces;
      niceMin = min;
      niceMax = max;
    } else if (countDefined) {
      niceMin = minDefined ? min : niceMin;
      niceMax = maxDefined ? max : niceMax;
      numSpaces = count - 1;
      spacing = (niceMax - niceMin) / numSpaces;
    } else {
      numSpaces = (niceMax - niceMin) / spacing;
      if (almostEquals(numSpaces, Math.round(numSpaces), spacing / 1e3)) {
        numSpaces = Math.round(numSpaces);
      } else {
        numSpaces = Math.ceil(numSpaces);
      }
    }
    const decimalPlaces = Math.max(_decimalPlaces(spacing), _decimalPlaces(niceMin));
    factor = Math.pow(10, isNullOrUndef(precision) ? decimalPlaces : precision);
    niceMin = Math.round(niceMin * factor) / factor;
    niceMax = Math.round(niceMax * factor) / factor;
    let j = 0;
    if (minDefined) {
      if (includeBounds && niceMin !== min) {
        ticks.push({ value: min });
        if (niceMin < min) {
          j++;
        }
        if (almostEquals(Math.round((niceMin + j * spacing) * factor) / factor, min, relativeLabelSize(min, minSpacing, generationOptions))) {
          j++;
        }
      } else if (niceMin < min) {
        j++;
      }
    }
    for (; j < numSpaces; ++j) {
      ticks.push({ value: Math.round((niceMin + j * spacing) * factor) / factor });
    }
    if (maxDefined && includeBounds && niceMax !== max) {
      if (ticks.length && almostEquals(ticks[ticks.length - 1].value, max, relativeLabelSize(max, minSpacing, generationOptions))) {
        ticks[ticks.length - 1].value = max;
      } else {
        ticks.push({ value: max });
      }
    } else if (!maxDefined || niceMax === max) {
      ticks.push({ value: niceMax });
    }
    return ticks;
  }
  function relativeLabelSize(value, minSpacing, { horizontal, minRotation }) {
    const rad = toRadians(minRotation);
    const ratio = (horizontal ? Math.sin(rad) : Math.cos(rad)) || 1e-3;
    const length = 0.75 * minSpacing * ("" + value).length;
    return Math.min(minSpacing / ratio, length);
  }
  var LinearScaleBase = class extends Scale {
    constructor(cfg) {
      super(cfg);
      this.start = void 0;
      this.end = void 0;
      this._startValue = void 0;
      this._endValue = void 0;
      this._valueRange = 0;
    }
    parse(raw, index) {
      if (isNullOrUndef(raw)) {
        return null;
      }
      if ((typeof raw === "number" || raw instanceof Number) && !isFinite(+raw)) {
        return null;
      }
      return +raw;
    }
    handleTickRangeOptions() {
      const { beginAtZero } = this.options;
      const { minDefined, maxDefined } = this.getUserBounds();
      let { min, max } = this;
      const setMin = (v2) => min = minDefined ? min : v2;
      const setMax = (v2) => max = maxDefined ? max : v2;
      if (beginAtZero) {
        const minSign = sign(min);
        const maxSign = sign(max);
        if (minSign < 0 && maxSign < 0) {
          setMax(0);
        } else if (minSign > 0 && maxSign > 0) {
          setMin(0);
        }
      }
      if (min === max) {
        let offset = 1;
        if (max >= Number.MAX_SAFE_INTEGER || min <= Number.MIN_SAFE_INTEGER) {
          offset = Math.abs(max * 0.05);
        }
        setMax(max + offset);
        if (!beginAtZero) {
          setMin(min - offset);
        }
      }
      this.min = min;
      this.max = max;
    }
    getTickLimit() {
      const tickOpts = this.options.ticks;
      let { maxTicksLimit, stepSize } = tickOpts;
      let maxTicks;
      if (stepSize) {
        maxTicks = Math.ceil(this.max / stepSize) - Math.floor(this.min / stepSize) + 1;
        if (maxTicks > 1e3) {
          console.warn(`scales.${this.id}.ticks.stepSize: ${stepSize} would result generating up to ${maxTicks} ticks. Limiting to 1000.`);
          maxTicks = 1e3;
        }
      } else {
        maxTicks = this.computeTickLimit();
        maxTicksLimit = maxTicksLimit || 11;
      }
      if (maxTicksLimit) {
        maxTicks = Math.min(maxTicksLimit, maxTicks);
      }
      return maxTicks;
    }
    computeTickLimit() {
      return Number.POSITIVE_INFINITY;
    }
    buildTicks() {
      const opts = this.options;
      const tickOpts = opts.ticks;
      let maxTicks = this.getTickLimit();
      maxTicks = Math.max(2, maxTicks);
      const numericGeneratorOptions = {
        maxTicks,
        bounds: opts.bounds,
        min: opts.min,
        max: opts.max,
        precision: tickOpts.precision,
        step: tickOpts.stepSize,
        count: tickOpts.count,
        maxDigits: this._maxDigits(),
        horizontal: this.isHorizontal(),
        minRotation: tickOpts.minRotation || 0,
        includeBounds: tickOpts.includeBounds !== false
      };
      const dataRange = this._range || this;
      const ticks = generateTicks$1(numericGeneratorOptions, dataRange);
      if (opts.bounds === "ticks") {
        _setMinAndMaxByKey(ticks, this, "value");
      }
      if (opts.reverse) {
        ticks.reverse();
        this.start = this.max;
        this.end = this.min;
      } else {
        this.start = this.min;
        this.end = this.max;
      }
      return ticks;
    }
    configure() {
      const ticks = this.ticks;
      let start = this.min;
      let end = this.max;
      super.configure();
      if (this.options.offset && ticks.length) {
        const offset = (end - start) / Math.max(ticks.length - 1, 1) / 2;
        start -= offset;
        end += offset;
      }
      this._startValue = start;
      this._endValue = end;
      this._valueRange = end - start;
    }
    getLabelForValue(value) {
      return formatNumber(value, this.chart.options.locale, this.options.ticks.format);
    }
  };
  var LinearScale = class extends LinearScaleBase {
    determineDataLimits() {
      const { min, max } = this.getMinMax(true);
      this.min = isNumberFinite(min) ? min : 0;
      this.max = isNumberFinite(max) ? max : 1;
      this.handleTickRangeOptions();
    }
    computeTickLimit() {
      const horizontal = this.isHorizontal();
      const length = horizontal ? this.width : this.height;
      const minRotation = toRadians(this.options.ticks.minRotation);
      const ratio = (horizontal ? Math.sin(minRotation) : Math.cos(minRotation)) || 1e-3;
      const tickFont = this._resolveTickFontOptions(0);
      return Math.ceil(length / Math.min(40, tickFont.lineHeight / ratio));
    }
    getPixelForValue(value) {
      return value === null ? NaN : this.getPixelForDecimal((value - this._startValue) / this._valueRange);
    }
    getValueForPixel(pixel) {
      return this._startValue + this.getDecimalForPixel(pixel) * this._valueRange;
    }
  };
  LinearScale.id = "linear";
  LinearScale.defaults = {
    ticks: {
      callback: Ticks.formatters.numeric
    }
  };
  function isMajor(tickVal) {
    const remain = tickVal / Math.pow(10, Math.floor(log10(tickVal)));
    return remain === 1;
  }
  function generateTicks(generationOptions, dataRange) {
    const endExp = Math.floor(log10(dataRange.max));
    const endSignificand = Math.ceil(dataRange.max / Math.pow(10, endExp));
    const ticks = [];
    let tickVal = finiteOrDefault(generationOptions.min, Math.pow(10, Math.floor(log10(dataRange.min))));
    let exp = Math.floor(log10(tickVal));
    let significand = Math.floor(tickVal / Math.pow(10, exp));
    let precision = exp < 0 ? Math.pow(10, Math.abs(exp)) : 1;
    do {
      ticks.push({ value: tickVal, major: isMajor(tickVal) });
      ++significand;
      if (significand === 10) {
        significand = 1;
        ++exp;
        precision = exp >= 0 ? 1 : precision;
      }
      tickVal = Math.round(significand * Math.pow(10, exp) * precision) / precision;
    } while (exp < endExp || exp === endExp && significand < endSignificand);
    const lastTick = finiteOrDefault(generationOptions.max, tickVal);
    ticks.push({ value: lastTick, major: isMajor(tickVal) });
    return ticks;
  }
  var LogarithmicScale = class extends Scale {
    constructor(cfg) {
      super(cfg);
      this.start = void 0;
      this.end = void 0;
      this._startValue = void 0;
      this._valueRange = 0;
    }
    parse(raw, index) {
      const value = LinearScaleBase.prototype.parse.apply(this, [raw, index]);
      if (value === 0) {
        this._zero = true;
        return void 0;
      }
      return isNumberFinite(value) && value > 0 ? value : null;
    }
    determineDataLimits() {
      const { min, max } = this.getMinMax(true);
      this.min = isNumberFinite(min) ? Math.max(0, min) : null;
      this.max = isNumberFinite(max) ? Math.max(0, max) : null;
      if (this.options.beginAtZero) {
        this._zero = true;
      }
      this.handleTickRangeOptions();
    }
    handleTickRangeOptions() {
      const { minDefined, maxDefined } = this.getUserBounds();
      let min = this.min;
      let max = this.max;
      const setMin = (v2) => min = minDefined ? min : v2;
      const setMax = (v2) => max = maxDefined ? max : v2;
      const exp = (v2, m3) => Math.pow(10, Math.floor(log10(v2)) + m3);
      if (min === max) {
        if (min <= 0) {
          setMin(1);
          setMax(10);
        } else {
          setMin(exp(min, -1));
          setMax(exp(max, 1));
        }
      }
      if (min <= 0) {
        setMin(exp(max, -1));
      }
      if (max <= 0) {
        setMax(exp(min, 1));
      }
      if (this._zero && this.min !== this._suggestedMin && min === exp(this.min, 0)) {
        setMin(exp(min, -1));
      }
      this.min = min;
      this.max = max;
    }
    buildTicks() {
      const opts = this.options;
      const generationOptions = {
        min: this._userMin,
        max: this._userMax
      };
      const ticks = generateTicks(generationOptions, this);
      if (opts.bounds === "ticks") {
        _setMinAndMaxByKey(ticks, this, "value");
      }
      if (opts.reverse) {
        ticks.reverse();
        this.start = this.max;
        this.end = this.min;
      } else {
        this.start = this.min;
        this.end = this.max;
      }
      return ticks;
    }
    getLabelForValue(value) {
      return value === void 0 ? "0" : formatNumber(value, this.chart.options.locale, this.options.ticks.format);
    }
    configure() {
      const start = this.min;
      super.configure();
      this._startValue = log10(start);
      this._valueRange = log10(this.max) - log10(start);
    }
    getPixelForValue(value) {
      if (value === void 0 || value === 0) {
        value = this.min;
      }
      if (value === null || isNaN(value)) {
        return NaN;
      }
      return this.getPixelForDecimal(value === this.min ? 0 : (log10(value) - this._startValue) / this._valueRange);
    }
    getValueForPixel(pixel) {
      const decimal = this.getDecimalForPixel(pixel);
      return Math.pow(10, this._startValue + decimal * this._valueRange);
    }
  };
  LogarithmicScale.id = "logarithmic";
  LogarithmicScale.defaults = {
    ticks: {
      callback: Ticks.formatters.logarithmic,
      major: {
        enabled: true
      }
    }
  };
  function getTickBackdropHeight(opts) {
    const tickOpts = opts.ticks;
    if (tickOpts.display && opts.display) {
      const padding = toPadding(tickOpts.backdropPadding);
      return valueOrDefault(tickOpts.font && tickOpts.font.size, defaults.font.size) + padding.height;
    }
    return 0;
  }
  function measureLabelSize(ctx, font, label) {
    label = isArray(label) ? label : [label];
    return {
      w: _longestText(ctx, font.string, label),
      h: label.length * font.lineHeight
    };
  }
  function determineLimits(angle, pos, size, min, max) {
    if (angle === min || angle === max) {
      return {
        start: pos - size / 2,
        end: pos + size / 2
      };
    } else if (angle < min || angle > max) {
      return {
        start: pos - size,
        end: pos
      };
    }
    return {
      start: pos,
      end: pos + size
    };
  }
  function fitWithPointLabels(scale) {
    const orig = {
      l: scale.left + scale._padding.left,
      r: scale.right - scale._padding.right,
      t: scale.top + scale._padding.top,
      b: scale.bottom - scale._padding.bottom
    };
    const limits = Object.assign({}, orig);
    const labelSizes = [];
    const padding = [];
    const valueCount = scale._pointLabels.length;
    const pointLabelOpts = scale.options.pointLabels;
    const additionalAngle = pointLabelOpts.centerPointLabels ? PI / valueCount : 0;
    for (let i4 = 0; i4 < valueCount; i4++) {
      const opts = pointLabelOpts.setContext(scale.getPointLabelContext(i4));
      padding[i4] = opts.padding;
      const pointPosition = scale.getPointPosition(i4, scale.drawingArea + padding[i4], additionalAngle);
      const plFont = toFont(opts.font);
      const textSize = measureLabelSize(scale.ctx, plFont, scale._pointLabels[i4]);
      labelSizes[i4] = textSize;
      const angleRadians = _normalizeAngle(scale.getIndexAngle(i4) + additionalAngle);
      const angle = Math.round(toDegrees(angleRadians));
      const hLimits = determineLimits(angle, pointPosition.x, textSize.w, 0, 180);
      const vLimits = determineLimits(angle, pointPosition.y, textSize.h, 90, 270);
      updateLimits(limits, orig, angleRadians, hLimits, vLimits);
    }
    scale.setCenterPoint(orig.l - limits.l, limits.r - orig.r, orig.t - limits.t, limits.b - orig.b);
    scale._pointLabelItems = buildPointLabelItems(scale, labelSizes, padding);
  }
  function updateLimits(limits, orig, angle, hLimits, vLimits) {
    const sin = Math.abs(Math.sin(angle));
    const cos = Math.abs(Math.cos(angle));
    let x2 = 0;
    let y2 = 0;
    if (hLimits.start < orig.l) {
      x2 = (orig.l - hLimits.start) / sin;
      limits.l = Math.min(limits.l, orig.l - x2);
    } else if (hLimits.end > orig.r) {
      x2 = (hLimits.end - orig.r) / sin;
      limits.r = Math.max(limits.r, orig.r + x2);
    }
    if (vLimits.start < orig.t) {
      y2 = (orig.t - vLimits.start) / cos;
      limits.t = Math.min(limits.t, orig.t - y2);
    } else if (vLimits.end > orig.b) {
      y2 = (vLimits.end - orig.b) / cos;
      limits.b = Math.max(limits.b, orig.b + y2);
    }
  }
  function buildPointLabelItems(scale, labelSizes, padding) {
    const items = [];
    const valueCount = scale._pointLabels.length;
    const opts = scale.options;
    const extra = getTickBackdropHeight(opts) / 2;
    const outerDistance = scale.drawingArea;
    const additionalAngle = opts.pointLabels.centerPointLabels ? PI / valueCount : 0;
    for (let i4 = 0; i4 < valueCount; i4++) {
      const pointLabelPosition = scale.getPointPosition(i4, outerDistance + extra + padding[i4], additionalAngle);
      const angle = Math.round(toDegrees(_normalizeAngle(pointLabelPosition.angle + HALF_PI)));
      const size = labelSizes[i4];
      const y2 = yForAngle(pointLabelPosition.y, size.h, angle);
      const textAlign = getTextAlignForAngle(angle);
      const left = leftForTextAlign(pointLabelPosition.x, size.w, textAlign);
      items.push({
        x: pointLabelPosition.x,
        y: y2,
        textAlign,
        left,
        top: y2,
        right: left + size.w,
        bottom: y2 + size.h
      });
    }
    return items;
  }
  function getTextAlignForAngle(angle) {
    if (angle === 0 || angle === 180) {
      return "center";
    } else if (angle < 180) {
      return "left";
    }
    return "right";
  }
  function leftForTextAlign(x2, w2, align) {
    if (align === "right") {
      x2 -= w2;
    } else if (align === "center") {
      x2 -= w2 / 2;
    }
    return x2;
  }
  function yForAngle(y2, h3, angle) {
    if (angle === 90 || angle === 270) {
      y2 -= h3 / 2;
    } else if (angle > 270 || angle < 90) {
      y2 -= h3;
    }
    return y2;
  }
  function drawPointLabels(scale, labelCount) {
    const { ctx, options: { pointLabels } } = scale;
    for (let i4 = labelCount - 1; i4 >= 0; i4--) {
      const optsAtIndex = pointLabels.setContext(scale.getPointLabelContext(i4));
      const plFont = toFont(optsAtIndex.font);
      const { x: x2, y: y2, textAlign, left, top, right, bottom } = scale._pointLabelItems[i4];
      const { backdropColor } = optsAtIndex;
      if (!isNullOrUndef(backdropColor)) {
        const padding = toPadding(optsAtIndex.backdropPadding);
        ctx.fillStyle = backdropColor;
        ctx.fillRect(left - padding.left, top - padding.top, right - left + padding.width, bottom - top + padding.height);
      }
      renderText(ctx, scale._pointLabels[i4], x2, y2 + plFont.lineHeight / 2, plFont, {
        color: optsAtIndex.color,
        textAlign,
        textBaseline: "middle"
      });
    }
  }
  function pathRadiusLine(scale, radius, circular, labelCount) {
    const { ctx } = scale;
    if (circular) {
      ctx.arc(scale.xCenter, scale.yCenter, radius, 0, TAU);
    } else {
      let pointPosition = scale.getPointPosition(0, radius);
      ctx.moveTo(pointPosition.x, pointPosition.y);
      for (let i4 = 1; i4 < labelCount; i4++) {
        pointPosition = scale.getPointPosition(i4, radius);
        ctx.lineTo(pointPosition.x, pointPosition.y);
      }
    }
  }
  function drawRadiusLine(scale, gridLineOpts, radius, labelCount) {
    const ctx = scale.ctx;
    const circular = gridLineOpts.circular;
    const { color: color2, lineWidth } = gridLineOpts;
    if (!circular && !labelCount || !color2 || !lineWidth || radius < 0) {
      return;
    }
    ctx.save();
    ctx.strokeStyle = color2;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(gridLineOpts.borderDash);
    ctx.lineDashOffset = gridLineOpts.borderDashOffset;
    ctx.beginPath();
    pathRadiusLine(scale, radius, circular, labelCount);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  function createPointLabelContext(parent, index, label) {
    return createContext(parent, {
      label,
      index,
      type: "pointLabel"
    });
  }
  var RadialLinearScale = class extends LinearScaleBase {
    constructor(cfg) {
      super(cfg);
      this.xCenter = void 0;
      this.yCenter = void 0;
      this.drawingArea = void 0;
      this._pointLabels = [];
      this._pointLabelItems = [];
    }
    setDimensions() {
      const padding = this._padding = toPadding(getTickBackdropHeight(this.options) / 2);
      const w2 = this.width = this.maxWidth - padding.width;
      const h3 = this.height = this.maxHeight - padding.height;
      this.xCenter = Math.floor(this.left + w2 / 2 + padding.left);
      this.yCenter = Math.floor(this.top + h3 / 2 + padding.top);
      this.drawingArea = Math.floor(Math.min(w2, h3) / 2);
    }
    determineDataLimits() {
      const { min, max } = this.getMinMax(false);
      this.min = isNumberFinite(min) && !isNaN(min) ? min : 0;
      this.max = isNumberFinite(max) && !isNaN(max) ? max : 0;
      this.handleTickRangeOptions();
    }
    computeTickLimit() {
      return Math.ceil(this.drawingArea / getTickBackdropHeight(this.options));
    }
    generateTickLabels(ticks) {
      LinearScaleBase.prototype.generateTickLabels.call(this, ticks);
      this._pointLabels = this.getLabels().map((value, index) => {
        const label = callback(this.options.pointLabels.callback, [value, index], this);
        return label || label === 0 ? label : "";
      }).filter((v2, i4) => this.chart.getDataVisibility(i4));
    }
    fit() {
      const opts = this.options;
      if (opts.display && opts.pointLabels.display) {
        fitWithPointLabels(this);
      } else {
        this.setCenterPoint(0, 0, 0, 0);
      }
    }
    setCenterPoint(leftMovement, rightMovement, topMovement, bottomMovement) {
      this.xCenter += Math.floor((leftMovement - rightMovement) / 2);
      this.yCenter += Math.floor((topMovement - bottomMovement) / 2);
      this.drawingArea -= Math.min(this.drawingArea / 2, Math.max(leftMovement, rightMovement, topMovement, bottomMovement));
    }
    getIndexAngle(index) {
      const angleMultiplier = TAU / (this._pointLabels.length || 1);
      const startAngle = this.options.startAngle || 0;
      return _normalizeAngle(index * angleMultiplier + toRadians(startAngle));
    }
    getDistanceFromCenterForValue(value) {
      if (isNullOrUndef(value)) {
        return NaN;
      }
      const scalingFactor = this.drawingArea / (this.max - this.min);
      if (this.options.reverse) {
        return (this.max - value) * scalingFactor;
      }
      return (value - this.min) * scalingFactor;
    }
    getValueForDistanceFromCenter(distance) {
      if (isNullOrUndef(distance)) {
        return NaN;
      }
      const scaledDistance = distance / (this.drawingArea / (this.max - this.min));
      return this.options.reverse ? this.max - scaledDistance : this.min + scaledDistance;
    }
    getPointLabelContext(index) {
      const pointLabels = this._pointLabels || [];
      if (index >= 0 && index < pointLabels.length) {
        const pointLabel = pointLabels[index];
        return createPointLabelContext(this.getContext(), index, pointLabel);
      }
    }
    getPointPosition(index, distanceFromCenter, additionalAngle = 0) {
      const angle = this.getIndexAngle(index) - HALF_PI + additionalAngle;
      return {
        x: Math.cos(angle) * distanceFromCenter + this.xCenter,
        y: Math.sin(angle) * distanceFromCenter + this.yCenter,
        angle
      };
    }
    getPointPositionForValue(index, value) {
      return this.getPointPosition(index, this.getDistanceFromCenterForValue(value));
    }
    getBasePosition(index) {
      return this.getPointPositionForValue(index || 0, this.getBaseValue());
    }
    getPointLabelPosition(index) {
      const { left, top, right, bottom } = this._pointLabelItems[index];
      return {
        left,
        top,
        right,
        bottom
      };
    }
    drawBackground() {
      const { backgroundColor, grid: { circular } } = this.options;
      if (backgroundColor) {
        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath();
        pathRadiusLine(this, this.getDistanceFromCenterForValue(this._endValue), circular, this._pointLabels.length);
        ctx.closePath();
        ctx.fillStyle = backgroundColor;
        ctx.fill();
        ctx.restore();
      }
    }
    drawGrid() {
      const ctx = this.ctx;
      const opts = this.options;
      const { angleLines, grid } = opts;
      const labelCount = this._pointLabels.length;
      let i4, offset, position;
      if (opts.pointLabels.display) {
        drawPointLabels(this, labelCount);
      }
      if (grid.display) {
        this.ticks.forEach((tick, index) => {
          if (index !== 0) {
            offset = this.getDistanceFromCenterForValue(tick.value);
            const optsAtIndex = grid.setContext(this.getContext(index - 1));
            drawRadiusLine(this, optsAtIndex, offset, labelCount);
          }
        });
      }
      if (angleLines.display) {
        ctx.save();
        for (i4 = labelCount - 1; i4 >= 0; i4--) {
          const optsAtIndex = angleLines.setContext(this.getPointLabelContext(i4));
          const { color: color2, lineWidth } = optsAtIndex;
          if (!lineWidth || !color2) {
            continue;
          }
          ctx.lineWidth = lineWidth;
          ctx.strokeStyle = color2;
          ctx.setLineDash(optsAtIndex.borderDash);
          ctx.lineDashOffset = optsAtIndex.borderDashOffset;
          offset = this.getDistanceFromCenterForValue(opts.ticks.reverse ? this.min : this.max);
          position = this.getPointPosition(i4, offset);
          ctx.beginPath();
          ctx.moveTo(this.xCenter, this.yCenter);
          ctx.lineTo(position.x, position.y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    drawBorder() {
    }
    drawLabels() {
      const ctx = this.ctx;
      const opts = this.options;
      const tickOpts = opts.ticks;
      if (!tickOpts.display) {
        return;
      }
      const startAngle = this.getIndexAngle(0);
      let offset, width;
      ctx.save();
      ctx.translate(this.xCenter, this.yCenter);
      ctx.rotate(startAngle);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      this.ticks.forEach((tick, index) => {
        if (index === 0 && !opts.reverse) {
          return;
        }
        const optsAtIndex = tickOpts.setContext(this.getContext(index));
        const tickFont = toFont(optsAtIndex.font);
        offset = this.getDistanceFromCenterForValue(this.ticks[index].value);
        if (optsAtIndex.showLabelBackdrop) {
          ctx.font = tickFont.string;
          width = ctx.measureText(tick.label).width;
          ctx.fillStyle = optsAtIndex.backdropColor;
          const padding = toPadding(optsAtIndex.backdropPadding);
          ctx.fillRect(-width / 2 - padding.left, -offset - tickFont.size / 2 - padding.top, width + padding.width, tickFont.size + padding.height);
        }
        renderText(ctx, tick.label, 0, -offset, tickFont, {
          color: optsAtIndex.color
        });
      });
      ctx.restore();
    }
    drawTitle() {
    }
  };
  RadialLinearScale.id = "radialLinear";
  RadialLinearScale.defaults = {
    display: true,
    animate: true,
    position: "chartArea",
    angleLines: {
      display: true,
      lineWidth: 1,
      borderDash: [],
      borderDashOffset: 0
    },
    grid: {
      circular: false
    },
    startAngle: 0,
    ticks: {
      showLabelBackdrop: true,
      callback: Ticks.formatters.numeric
    },
    pointLabels: {
      backdropColor: void 0,
      backdropPadding: 2,
      display: true,
      font: {
        size: 10
      },
      callback(label) {
        return label;
      },
      padding: 5,
      centerPointLabels: false
    }
  };
  RadialLinearScale.defaultRoutes = {
    "angleLines.color": "borderColor",
    "pointLabels.color": "color",
    "ticks.color": "color"
  };
  RadialLinearScale.descriptors = {
    angleLines: {
      _fallback: "grid"
    }
  };
  var INTERVALS = {
    millisecond: { common: true, size: 1, steps: 1e3 },
    second: { common: true, size: 1e3, steps: 60 },
    minute: { common: true, size: 6e4, steps: 60 },
    hour: { common: true, size: 36e5, steps: 24 },
    day: { common: true, size: 864e5, steps: 30 },
    week: { common: false, size: 6048e5, steps: 4 },
    month: { common: true, size: 2628e6, steps: 12 },
    quarter: { common: false, size: 7884e6, steps: 4 },
    year: { common: true, size: 3154e7 }
  };
  var UNITS = Object.keys(INTERVALS);
  function sorter(a3, b2) {
    return a3 - b2;
  }
  function parse(scale, input) {
    if (isNullOrUndef(input)) {
      return null;
    }
    const adapter = scale._adapter;
    const { parser, round: round2, isoWeekday } = scale._parseOpts;
    let value = input;
    if (typeof parser === "function") {
      value = parser(value);
    }
    if (!isNumberFinite(value)) {
      value = typeof parser === "string" ? adapter.parse(value, parser) : adapter.parse(value);
    }
    if (value === null) {
      return null;
    }
    if (round2) {
      value = round2 === "week" && (isNumber(isoWeekday) || isoWeekday === true) ? adapter.startOf(value, "isoWeek", isoWeekday) : adapter.startOf(value, round2);
    }
    return +value;
  }
  function determineUnitForAutoTicks(minUnit, min, max, capacity) {
    const ilen = UNITS.length;
    for (let i4 = UNITS.indexOf(minUnit); i4 < ilen - 1; ++i4) {
      const interval = INTERVALS[UNITS[i4]];
      const factor = interval.steps ? interval.steps : Number.MAX_SAFE_INTEGER;
      if (interval.common && Math.ceil((max - min) / (factor * interval.size)) <= capacity) {
        return UNITS[i4];
      }
    }
    return UNITS[ilen - 1];
  }
  function determineUnitForFormatting(scale, numTicks, minUnit, min, max) {
    for (let i4 = UNITS.length - 1; i4 >= UNITS.indexOf(minUnit); i4--) {
      const unit = UNITS[i4];
      if (INTERVALS[unit].common && scale._adapter.diff(max, min, unit) >= numTicks - 1) {
        return unit;
      }
    }
    return UNITS[minUnit ? UNITS.indexOf(minUnit) : 0];
  }
  function determineMajorUnit(unit) {
    for (let i4 = UNITS.indexOf(unit) + 1, ilen = UNITS.length; i4 < ilen; ++i4) {
      if (INTERVALS[UNITS[i4]].common) {
        return UNITS[i4];
      }
    }
  }
  function addTick(ticks, time, timestamps) {
    if (!timestamps) {
      ticks[time] = true;
    } else if (timestamps.length) {
      const { lo, hi } = _lookup(timestamps, time);
      const timestamp = timestamps[lo] >= time ? timestamps[lo] : timestamps[hi];
      ticks[timestamp] = true;
    }
  }
  function setMajorTicks(scale, ticks, map2, majorUnit) {
    const adapter = scale._adapter;
    const first = +adapter.startOf(ticks[0].value, majorUnit);
    const last = ticks[ticks.length - 1].value;
    let major, index;
    for (major = first; major <= last; major = +adapter.add(major, 1, majorUnit)) {
      index = map2[major];
      if (index >= 0) {
        ticks[index].major = true;
      }
    }
    return ticks;
  }
  function ticksFromTimestamps(scale, values, majorUnit) {
    const ticks = [];
    const map2 = {};
    const ilen = values.length;
    let i4, value;
    for (i4 = 0; i4 < ilen; ++i4) {
      value = values[i4];
      map2[value] = i4;
      ticks.push({
        value,
        major: false
      });
    }
    return ilen === 0 || !majorUnit ? ticks : setMajorTicks(scale, ticks, map2, majorUnit);
  }
  var TimeScale = class extends Scale {
    constructor(props) {
      super(props);
      this._cache = {
        data: [],
        labels: [],
        all: []
      };
      this._unit = "day";
      this._majorUnit = void 0;
      this._offsets = {};
      this._normalized = false;
      this._parseOpts = void 0;
    }
    init(scaleOpts, opts) {
      const time = scaleOpts.time || (scaleOpts.time = {});
      const adapter = this._adapter = new adapters._date(scaleOpts.adapters.date);
      mergeIf(time.displayFormats, adapter.formats());
      this._parseOpts = {
        parser: time.parser,
        round: time.round,
        isoWeekday: time.isoWeekday
      };
      super.init(scaleOpts);
      this._normalized = opts.normalized;
    }
    parse(raw, index) {
      if (raw === void 0) {
        return null;
      }
      return parse(this, raw);
    }
    beforeLayout() {
      super.beforeLayout();
      this._cache = {
        data: [],
        labels: [],
        all: []
      };
    }
    determineDataLimits() {
      const options = this.options;
      const adapter = this._adapter;
      const unit = options.time.unit || "day";
      let { min, max, minDefined, maxDefined } = this.getUserBounds();
      function _applyBounds(bounds) {
        if (!minDefined && !isNaN(bounds.min)) {
          min = Math.min(min, bounds.min);
        }
        if (!maxDefined && !isNaN(bounds.max)) {
          max = Math.max(max, bounds.max);
        }
      }
      if (!minDefined || !maxDefined) {
        _applyBounds(this._getLabelBounds());
        if (options.bounds !== "ticks" || options.ticks.source !== "labels") {
          _applyBounds(this.getMinMax(false));
        }
      }
      min = isNumberFinite(min) && !isNaN(min) ? min : +adapter.startOf(Date.now(), unit);
      max = isNumberFinite(max) && !isNaN(max) ? max : +adapter.endOf(Date.now(), unit) + 1;
      this.min = Math.min(min, max - 1);
      this.max = Math.max(min + 1, max);
    }
    _getLabelBounds() {
      const arr = this.getLabelTimestamps();
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      if (arr.length) {
        min = arr[0];
        max = arr[arr.length - 1];
      }
      return { min, max };
    }
    buildTicks() {
      const options = this.options;
      const timeOpts = options.time;
      const tickOpts = options.ticks;
      const timestamps = tickOpts.source === "labels" ? this.getLabelTimestamps() : this._generate();
      if (options.bounds === "ticks" && timestamps.length) {
        this.min = this._userMin || timestamps[0];
        this.max = this._userMax || timestamps[timestamps.length - 1];
      }
      const min = this.min;
      const max = this.max;
      const ticks = _filterBetween(timestamps, min, max);
      this._unit = timeOpts.unit || (tickOpts.autoSkip ? determineUnitForAutoTicks(timeOpts.minUnit, this.min, this.max, this._getLabelCapacity(min)) : determineUnitForFormatting(this, ticks.length, timeOpts.minUnit, this.min, this.max));
      this._majorUnit = !tickOpts.major.enabled || this._unit === "year" ? void 0 : determineMajorUnit(this._unit);
      this.initOffsets(timestamps);
      if (options.reverse) {
        ticks.reverse();
      }
      return ticksFromTimestamps(this, ticks, this._majorUnit);
    }
    initOffsets(timestamps) {
      let start = 0;
      let end = 0;
      let first, last;
      if (this.options.offset && timestamps.length) {
        first = this.getDecimalForValue(timestamps[0]);
        if (timestamps.length === 1) {
          start = 1 - first;
        } else {
          start = (this.getDecimalForValue(timestamps[1]) - first) / 2;
        }
        last = this.getDecimalForValue(timestamps[timestamps.length - 1]);
        if (timestamps.length === 1) {
          end = last;
        } else {
          end = (last - this.getDecimalForValue(timestamps[timestamps.length - 2])) / 2;
        }
      }
      const limit = timestamps.length < 3 ? 0.5 : 0.25;
      start = _limitValue(start, 0, limit);
      end = _limitValue(end, 0, limit);
      this._offsets = { start, end, factor: 1 / (start + 1 + end) };
    }
    _generate() {
      const adapter = this._adapter;
      const min = this.min;
      const max = this.max;
      const options = this.options;
      const timeOpts = options.time;
      const minor = timeOpts.unit || determineUnitForAutoTicks(timeOpts.minUnit, min, max, this._getLabelCapacity(min));
      const stepSize = valueOrDefault(timeOpts.stepSize, 1);
      const weekday = minor === "week" ? timeOpts.isoWeekday : false;
      const hasWeekday = isNumber(weekday) || weekday === true;
      const ticks = {};
      let first = min;
      let time, count;
      if (hasWeekday) {
        first = +adapter.startOf(first, "isoWeek", weekday);
      }
      first = +adapter.startOf(first, hasWeekday ? "day" : minor);
      if (adapter.diff(max, min, minor) > 1e5 * stepSize) {
        throw new Error(min + " and " + max + " are too far apart with stepSize of " + stepSize + " " + minor);
      }
      const timestamps = options.ticks.source === "data" && this.getDataTimestamps();
      for (time = first, count = 0; time < max; time = +adapter.add(time, stepSize, minor), count++) {
        addTick(ticks, time, timestamps);
      }
      if (time === max || options.bounds === "ticks" || count === 1) {
        addTick(ticks, time, timestamps);
      }
      return Object.keys(ticks).sort((a3, b2) => a3 - b2).map((x2) => +x2);
    }
    getLabelForValue(value) {
      const adapter = this._adapter;
      const timeOpts = this.options.time;
      if (timeOpts.tooltipFormat) {
        return adapter.format(value, timeOpts.tooltipFormat);
      }
      return adapter.format(value, timeOpts.displayFormats.datetime);
    }
    _tickFormatFunction(time, index, ticks, format2) {
      const options = this.options;
      const formats = options.time.displayFormats;
      const unit = this._unit;
      const majorUnit = this._majorUnit;
      const minorFormat = unit && formats[unit];
      const majorFormat = majorUnit && formats[majorUnit];
      const tick = ticks[index];
      const major = majorUnit && majorFormat && tick && tick.major;
      const label = this._adapter.format(time, format2 || (major ? majorFormat : minorFormat));
      const formatter = options.ticks.callback;
      return formatter ? callback(formatter, [label, index, ticks], this) : label;
    }
    generateTickLabels(ticks) {
      let i4, ilen, tick;
      for (i4 = 0, ilen = ticks.length; i4 < ilen; ++i4) {
        tick = ticks[i4];
        tick.label = this._tickFormatFunction(tick.value, i4, ticks);
      }
    }
    getDecimalForValue(value) {
      return value === null ? NaN : (value - this.min) / (this.max - this.min);
    }
    getPixelForValue(value) {
      const offsets = this._offsets;
      const pos = this.getDecimalForValue(value);
      return this.getPixelForDecimal((offsets.start + pos) * offsets.factor);
    }
    getValueForPixel(pixel) {
      const offsets = this._offsets;
      const pos = this.getDecimalForPixel(pixel) / offsets.factor - offsets.end;
      return this.min + pos * (this.max - this.min);
    }
    _getLabelSize(label) {
      const ticksOpts = this.options.ticks;
      const tickLabelWidth = this.ctx.measureText(label).width;
      const angle = toRadians(this.isHorizontal() ? ticksOpts.maxRotation : ticksOpts.minRotation);
      const cosRotation = Math.cos(angle);
      const sinRotation = Math.sin(angle);
      const tickFontSize = this._resolveTickFontOptions(0).size;
      return {
        w: tickLabelWidth * cosRotation + tickFontSize * sinRotation,
        h: tickLabelWidth * sinRotation + tickFontSize * cosRotation
      };
    }
    _getLabelCapacity(exampleTime) {
      const timeOpts = this.options.time;
      const displayFormats = timeOpts.displayFormats;
      const format2 = displayFormats[timeOpts.unit] || displayFormats.millisecond;
      const exampleLabel = this._tickFormatFunction(exampleTime, 0, ticksFromTimestamps(this, [exampleTime], this._majorUnit), format2);
      const size = this._getLabelSize(exampleLabel);
      const capacity = Math.floor(this.isHorizontal() ? this.width / size.w : this.height / size.h) - 1;
      return capacity > 0 ? capacity : 1;
    }
    getDataTimestamps() {
      let timestamps = this._cache.data || [];
      let i4, ilen;
      if (timestamps.length) {
        return timestamps;
      }
      const metas = this.getMatchingVisibleMetas();
      if (this._normalized && metas.length) {
        return this._cache.data = metas[0].controller.getAllParsedValues(this);
      }
      for (i4 = 0, ilen = metas.length; i4 < ilen; ++i4) {
        timestamps = timestamps.concat(metas[i4].controller.getAllParsedValues(this));
      }
      return this._cache.data = this.normalize(timestamps);
    }
    getLabelTimestamps() {
      const timestamps = this._cache.labels || [];
      let i4, ilen;
      if (timestamps.length) {
        return timestamps;
      }
      const labels = this.getLabels();
      for (i4 = 0, ilen = labels.length; i4 < ilen; ++i4) {
        timestamps.push(parse(this, labels[i4]));
      }
      return this._cache.labels = this._normalized ? timestamps : this.normalize(timestamps);
    }
    normalize(values) {
      return _arrayUnique(values.sort(sorter));
    }
  };
  TimeScale.id = "time";
  TimeScale.defaults = {
    bounds: "data",
    adapters: {},
    time: {
      parser: false,
      unit: false,
      round: false,
      isoWeekday: false,
      minUnit: "millisecond",
      displayFormats: {}
    },
    ticks: {
      source: "auto",
      major: {
        enabled: false
      }
    }
  };
  function interpolate(table, val, reverse) {
    let lo = 0;
    let hi = table.length - 1;
    let prevSource, nextSource, prevTarget, nextTarget;
    if (reverse) {
      if (val >= table[lo].pos && val <= table[hi].pos) {
        ({ lo, hi } = _lookupByKey(table, "pos", val));
      }
      ({ pos: prevSource, time: prevTarget } = table[lo]);
      ({ pos: nextSource, time: nextTarget } = table[hi]);
    } else {
      if (val >= table[lo].time && val <= table[hi].time) {
        ({ lo, hi } = _lookupByKey(table, "time", val));
      }
      ({ time: prevSource, pos: prevTarget } = table[lo]);
      ({ time: nextSource, pos: nextTarget } = table[hi]);
    }
    const span = nextSource - prevSource;
    return span ? prevTarget + (nextTarget - prevTarget) * (val - prevSource) / span : prevTarget;
  }
  var TimeSeriesScale = class extends TimeScale {
    constructor(props) {
      super(props);
      this._table = [];
      this._minPos = void 0;
      this._tableRange = void 0;
    }
    initOffsets() {
      const timestamps = this._getTimestampsForTable();
      const table = this._table = this.buildLookupTable(timestamps);
      this._minPos = interpolate(table, this.min);
      this._tableRange = interpolate(table, this.max) - this._minPos;
      super.initOffsets(timestamps);
    }
    buildLookupTable(timestamps) {
      const { min, max } = this;
      const items = [];
      const table = [];
      let i4, ilen, prev, curr, next;
      for (i4 = 0, ilen = timestamps.length; i4 < ilen; ++i4) {
        curr = timestamps[i4];
        if (curr >= min && curr <= max) {
          items.push(curr);
        }
      }
      if (items.length < 2) {
        return [
          { time: min, pos: 0 },
          { time: max, pos: 1 }
        ];
      }
      for (i4 = 0, ilen = items.length; i4 < ilen; ++i4) {
        next = items[i4 + 1];
        prev = items[i4 - 1];
        curr = items[i4];
        if (Math.round((next + prev) / 2) !== curr) {
          table.push({ time: curr, pos: i4 / (ilen - 1) });
        }
      }
      return table;
    }
    _getTimestampsForTable() {
      let timestamps = this._cache.all || [];
      if (timestamps.length) {
        return timestamps;
      }
      const data = this.getDataTimestamps();
      const label = this.getLabelTimestamps();
      if (data.length && label.length) {
        timestamps = this.normalize(data.concat(label));
      } else {
        timestamps = data.length ? data : label;
      }
      timestamps = this._cache.all = timestamps;
      return timestamps;
    }
    getDecimalForValue(value) {
      return (interpolate(this._table, value) - this._minPos) / this._tableRange;
    }
    getValueForPixel(pixel) {
      const offsets = this._offsets;
      const decimal = this.getDecimalForPixel(pixel) / offsets.factor - offsets.end;
      return interpolate(this._table, decimal * this._tableRange + this._minPos, true);
    }
  };
  TimeSeriesScale.id = "timeseries";
  TimeSeriesScale.defaults = TimeScale.defaults;

  // node_modules/date-fns/esm/_lib/toInteger/index.js
  function toInteger(dirtyNumber) {
    if (dirtyNumber === null || dirtyNumber === true || dirtyNumber === false) {
      return NaN;
    }
    var number = Number(dirtyNumber);
    if (isNaN(number)) {
      return number;
    }
    return number < 0 ? Math.ceil(number) : Math.floor(number);
  }

  // node_modules/date-fns/esm/_lib/requiredArgs/index.js
  function requiredArgs(required, args) {
    if (args.length < required) {
      throw new TypeError(required + " argument" + (required > 1 ? "s" : "") + " required, but only " + args.length + " present");
    }
  }

  // node_modules/date-fns/esm/toDate/index.js
  function toDate(argument) {
    requiredArgs(1, arguments);
    var argStr = Object.prototype.toString.call(argument);
    if (argument instanceof Date || typeof argument === "object" && argStr === "[object Date]") {
      return new Date(argument.getTime());
    } else if (typeof argument === "number" || argStr === "[object Number]") {
      return new Date(argument);
    } else {
      if ((typeof argument === "string" || argStr === "[object String]") && typeof console !== "undefined") {
        console.warn("Starting with v2.0.0-beta.1 date-fns doesn't accept strings as date arguments. Please use `parseISO` to parse strings. See: https://git.io/fjule");
        console.warn(new Error().stack);
      }
      return new Date(NaN);
    }
  }

  // node_modules/date-fns/esm/addDays/index.js
  function addDays(dirtyDate, dirtyAmount) {
    requiredArgs(2, arguments);
    var date = toDate(dirtyDate);
    var amount = toInteger(dirtyAmount);
    if (isNaN(amount)) {
      return new Date(NaN);
    }
    if (!amount) {
      return date;
    }
    date.setDate(date.getDate() + amount);
    return date;
  }

  // node_modules/date-fns/esm/addMonths/index.js
  function addMonths(dirtyDate, dirtyAmount) {
    requiredArgs(2, arguments);
    var date = toDate(dirtyDate);
    var amount = toInteger(dirtyAmount);
    if (isNaN(amount)) {
      return new Date(NaN);
    }
    if (!amount) {
      return date;
    }
    var dayOfMonth = date.getDate();
    var endOfDesiredMonth = new Date(date.getTime());
    endOfDesiredMonth.setMonth(date.getMonth() + amount + 1, 0);
    var daysInMonth = endOfDesiredMonth.getDate();
    if (dayOfMonth >= daysInMonth) {
      return endOfDesiredMonth;
    } else {
      date.setFullYear(endOfDesiredMonth.getFullYear(), endOfDesiredMonth.getMonth(), dayOfMonth);
      return date;
    }
  }

  // node_modules/date-fns/esm/addMilliseconds/index.js
  function addMilliseconds(dirtyDate, dirtyAmount) {
    requiredArgs(2, arguments);
    var timestamp = toDate(dirtyDate).getTime();
    var amount = toInteger(dirtyAmount);
    return new Date(timestamp + amount);
  }

  // node_modules/date-fns/esm/addHours/index.js
  var MILLISECONDS_IN_HOUR = 36e5;
  function addHours(dirtyDate, dirtyAmount) {
    requiredArgs(2, arguments);
    var amount = toInteger(dirtyAmount);
    return addMilliseconds(dirtyDate, amount * MILLISECONDS_IN_HOUR);
  }

  // node_modules/date-fns/esm/startOfWeek/index.js
  function startOfWeek(dirtyDate, dirtyOptions) {
    requiredArgs(1, arguments);
    var options = dirtyOptions || {};
    var locale3 = options.locale;
    var localeWeekStartsOn = locale3 && locale3.options && locale3.options.weekStartsOn;
    var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
    var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn);
    if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
      throw new RangeError("weekStartsOn must be between 0 and 6 inclusively");
    }
    var date = toDate(dirtyDate);
    var day = date.getDay();
    var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // node_modules/date-fns/esm/_lib/getTimezoneOffsetInMilliseconds/index.js
  function getTimezoneOffsetInMilliseconds(date) {
    var utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()));
    utcDate.setUTCFullYear(date.getFullYear());
    return date.getTime() - utcDate.getTime();
  }

  // node_modules/date-fns/esm/startOfDay/index.js
  function startOfDay(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // node_modules/date-fns/esm/differenceInCalendarDays/index.js
  var MILLISECONDS_IN_DAY = 864e5;
  function differenceInCalendarDays(dirtyDateLeft, dirtyDateRight) {
    requiredArgs(2, arguments);
    var startOfDayLeft = startOfDay(dirtyDateLeft);
    var startOfDayRight = startOfDay(dirtyDateRight);
    var timestampLeft = startOfDayLeft.getTime() - getTimezoneOffsetInMilliseconds(startOfDayLeft);
    var timestampRight = startOfDayRight.getTime() - getTimezoneOffsetInMilliseconds(startOfDayRight);
    return Math.round((timestampLeft - timestampRight) / MILLISECONDS_IN_DAY);
  }

  // node_modules/date-fns/esm/addMinutes/index.js
  var MILLISECONDS_IN_MINUTE = 6e4;
  function addMinutes(dirtyDate, dirtyAmount) {
    requiredArgs(2, arguments);
    var amount = toInteger(dirtyAmount);
    return addMilliseconds(dirtyDate, amount * MILLISECONDS_IN_MINUTE);
  }

  // node_modules/date-fns/esm/addQuarters/index.js
  function addQuarters(dirtyDate, dirtyAmount) {
    requiredArgs(2, arguments);
    var amount = toInteger(dirtyAmount);
    var months = amount * 3;
    return addMonths(dirtyDate, months);
  }

  // node_modules/date-fns/esm/addSeconds/index.js
  function addSeconds(dirtyDate, dirtyAmount) {
    requiredArgs(2, arguments);
    var amount = toInteger(dirtyAmount);
    return addMilliseconds(dirtyDate, amount * 1e3);
  }

  // node_modules/date-fns/esm/addWeeks/index.js
  function addWeeks(dirtyDate, dirtyAmount) {
    requiredArgs(2, arguments);
    var amount = toInteger(dirtyAmount);
    var days = amount * 7;
    return addDays(dirtyDate, days);
  }

  // node_modules/date-fns/esm/addYears/index.js
  function addYears(dirtyDate, dirtyAmount) {
    requiredArgs(2, arguments);
    var amount = toInteger(dirtyAmount);
    return addMonths(dirtyDate, amount * 12);
  }

  // node_modules/date-fns/esm/compareAsc/index.js
  function compareAsc(dirtyDateLeft, dirtyDateRight) {
    requiredArgs(2, arguments);
    var dateLeft = toDate(dirtyDateLeft);
    var dateRight = toDate(dirtyDateRight);
    var diff = dateLeft.getTime() - dateRight.getTime();
    if (diff < 0) {
      return -1;
    } else if (diff > 0) {
      return 1;
    } else {
      return diff;
    }
  }

  // node_modules/date-fns/esm/constants/index.js
  var maxTime = Math.pow(10, 8) * 24 * 60 * 60 * 1e3;
  var millisecondsInMinute = 6e4;
  var millisecondsInHour = 36e5;
  var minTime = -maxTime;

  // node_modules/date-fns/esm/isDate/index.js
  function isDate(value) {
    requiredArgs(1, arguments);
    return value instanceof Date || typeof value === "object" && Object.prototype.toString.call(value) === "[object Date]";
  }

  // node_modules/date-fns/esm/isValid/index.js
  function isValid(dirtyDate) {
    requiredArgs(1, arguments);
    if (!isDate(dirtyDate) && typeof dirtyDate !== "number") {
      return false;
    }
    var date = toDate(dirtyDate);
    return !isNaN(Number(date));
  }

  // node_modules/date-fns/esm/differenceInCalendarMonths/index.js
  function differenceInCalendarMonths(dirtyDateLeft, dirtyDateRight) {
    requiredArgs(2, arguments);
    var dateLeft = toDate(dirtyDateLeft);
    var dateRight = toDate(dirtyDateRight);
    var yearDiff = dateLeft.getFullYear() - dateRight.getFullYear();
    var monthDiff = dateLeft.getMonth() - dateRight.getMonth();
    return yearDiff * 12 + monthDiff;
  }

  // node_modules/date-fns/esm/differenceInCalendarYears/index.js
  function differenceInCalendarYears(dirtyDateLeft, dirtyDateRight) {
    requiredArgs(2, arguments);
    var dateLeft = toDate(dirtyDateLeft);
    var dateRight = toDate(dirtyDateRight);
    return dateLeft.getFullYear() - dateRight.getFullYear();
  }

  // node_modules/date-fns/esm/differenceInDays/index.js
  function compareLocalAsc(dateLeft, dateRight) {
    var diff = dateLeft.getFullYear() - dateRight.getFullYear() || dateLeft.getMonth() - dateRight.getMonth() || dateLeft.getDate() - dateRight.getDate() || dateLeft.getHours() - dateRight.getHours() || dateLeft.getMinutes() - dateRight.getMinutes() || dateLeft.getSeconds() - dateRight.getSeconds() || dateLeft.getMilliseconds() - dateRight.getMilliseconds();
    if (diff < 0) {
      return -1;
    } else if (diff > 0) {
      return 1;
    } else {
      return diff;
    }
  }
  function differenceInDays(dirtyDateLeft, dirtyDateRight) {
    requiredArgs(2, arguments);
    var dateLeft = toDate(dirtyDateLeft);
    var dateRight = toDate(dirtyDateRight);
    var sign2 = compareLocalAsc(dateLeft, dateRight);
    var difference = Math.abs(differenceInCalendarDays(dateLeft, dateRight));
    dateLeft.setDate(dateLeft.getDate() - sign2 * difference);
    var isLastDayNotFull = Number(compareLocalAsc(dateLeft, dateRight) === -sign2);
    var result = sign2 * (difference - isLastDayNotFull);
    return result === 0 ? 0 : result;
  }

  // node_modules/date-fns/esm/differenceInMilliseconds/index.js
  function differenceInMilliseconds(dateLeft, dateRight) {
    requiredArgs(2, arguments);
    return toDate(dateLeft).getTime() - toDate(dateRight).getTime();
  }

  // node_modules/date-fns/esm/_lib/roundingMethods/index.js
  var roundingMap = {
    ceil: Math.ceil,
    round: Math.round,
    floor: Math.floor,
    trunc: function(value) {
      return value < 0 ? Math.ceil(value) : Math.floor(value);
    }
  };
  var defaultRoundingMethod = "trunc";
  function getRoundingMethod(method) {
    return method ? roundingMap[method] : roundingMap[defaultRoundingMethod];
  }

  // node_modules/date-fns/esm/differenceInHours/index.js
  function differenceInHours(dateLeft, dateRight, options) {
    requiredArgs(2, arguments);
    var diff = differenceInMilliseconds(dateLeft, dateRight) / millisecondsInHour;
    return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
  }

  // node_modules/date-fns/esm/differenceInMinutes/index.js
  function differenceInMinutes(dateLeft, dateRight, options) {
    requiredArgs(2, arguments);
    var diff = differenceInMilliseconds(dateLeft, dateRight) / millisecondsInMinute;
    return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
  }

  // node_modules/date-fns/esm/endOfDay/index.js
  function endOfDay(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  // node_modules/date-fns/esm/endOfMonth/index.js
  function endOfMonth(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    var month = date.getMonth();
    date.setFullYear(date.getFullYear(), month + 1, 0);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  // node_modules/date-fns/esm/isLastDayOfMonth/index.js
  function isLastDayOfMonth(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    return endOfDay(date).getTime() === endOfMonth(date).getTime();
  }

  // node_modules/date-fns/esm/differenceInMonths/index.js
  function differenceInMonths(dirtyDateLeft, dirtyDateRight) {
    requiredArgs(2, arguments);
    var dateLeft = toDate(dirtyDateLeft);
    var dateRight = toDate(dirtyDateRight);
    var sign2 = compareAsc(dateLeft, dateRight);
    var difference = Math.abs(differenceInCalendarMonths(dateLeft, dateRight));
    var result;
    if (difference < 1) {
      result = 0;
    } else {
      if (dateLeft.getMonth() === 1 && dateLeft.getDate() > 27) {
        dateLeft.setDate(30);
      }
      dateLeft.setMonth(dateLeft.getMonth() - sign2 * difference);
      var isLastMonthNotFull = compareAsc(dateLeft, dateRight) === -sign2;
      if (isLastDayOfMonth(toDate(dirtyDateLeft)) && difference === 1 && compareAsc(dirtyDateLeft, dateRight) === 1) {
        isLastMonthNotFull = false;
      }
      result = sign2 * (difference - Number(isLastMonthNotFull));
    }
    return result === 0 ? 0 : result;
  }

  // node_modules/date-fns/esm/differenceInQuarters/index.js
  function differenceInQuarters(dateLeft, dateRight, options) {
    requiredArgs(2, arguments);
    var diff = differenceInMonths(dateLeft, dateRight) / 3;
    return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
  }

  // node_modules/date-fns/esm/differenceInSeconds/index.js
  function differenceInSeconds(dateLeft, dateRight, options) {
    requiredArgs(2, arguments);
    var diff = differenceInMilliseconds(dateLeft, dateRight) / 1e3;
    return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
  }

  // node_modules/date-fns/esm/differenceInWeeks/index.js
  function differenceInWeeks(dateLeft, dateRight, options) {
    requiredArgs(2, arguments);
    var diff = differenceInDays(dateLeft, dateRight) / 7;
    return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
  }

  // node_modules/date-fns/esm/differenceInYears/index.js
  function differenceInYears(dirtyDateLeft, dirtyDateRight) {
    requiredArgs(2, arguments);
    var dateLeft = toDate(dirtyDateLeft);
    var dateRight = toDate(dirtyDateRight);
    var sign2 = compareAsc(dateLeft, dateRight);
    var difference = Math.abs(differenceInCalendarYears(dateLeft, dateRight));
    dateLeft.setFullYear(1584);
    dateRight.setFullYear(1584);
    var isLastYearNotFull = compareAsc(dateLeft, dateRight) === -sign2;
    var result = sign2 * (difference - Number(isLastYearNotFull));
    return result === 0 ? 0 : result;
  }

  // node_modules/date-fns/esm/startOfMinute/index.js
  function startOfMinute(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    date.setSeconds(0, 0);
    return date;
  }

  // node_modules/date-fns/esm/startOfQuarter/index.js
  function startOfQuarter(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    var currentMonth = date.getMonth();
    var month = currentMonth - currentMonth % 3;
    date.setMonth(month, 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // node_modules/date-fns/esm/startOfMonth/index.js
  function startOfMonth(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // node_modules/date-fns/esm/startOfYear/index.js
  function startOfYear(dirtyDate) {
    requiredArgs(1, arguments);
    var cleanDate = toDate(dirtyDate);
    var date = new Date(0);
    date.setFullYear(cleanDate.getFullYear(), 0, 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // node_modules/date-fns/esm/endOfYear/index.js
  function endOfYear(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    var year = date.getFullYear();
    date.setFullYear(year + 1, 0, 0);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  // node_modules/date-fns/esm/endOfHour/index.js
  function endOfHour(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    date.setMinutes(59, 59, 999);
    return date;
  }

  // node_modules/date-fns/esm/endOfWeek/index.js
  function endOfWeek(dirtyDate, dirtyOptions) {
    requiredArgs(1, arguments);
    var options = dirtyOptions || {};
    var locale3 = options.locale;
    var localeWeekStartsOn = locale3 && locale3.options && locale3.options.weekStartsOn;
    var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
    var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn);
    if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
      throw new RangeError("weekStartsOn must be between 0 and 6 inclusively");
    }
    var date = toDate(dirtyDate);
    var day = date.getDay();
    var diff = (day < weekStartsOn ? -7 : 0) + 6 - (day - weekStartsOn);
    date.setDate(date.getDate() + diff);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  // node_modules/date-fns/esm/endOfMinute/index.js
  function endOfMinute(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    date.setSeconds(59, 999);
    return date;
  }

  // node_modules/date-fns/esm/endOfQuarter/index.js
  function endOfQuarter(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    var currentMonth = date.getMonth();
    var month = currentMonth - currentMonth % 3 + 3;
    date.setMonth(month, 0);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  // node_modules/date-fns/esm/endOfSecond/index.js
  function endOfSecond(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    date.setMilliseconds(999);
    return date;
  }

  // node_modules/date-fns/esm/locale/en-US/_lib/formatDistance/index.js
  var formatDistanceLocale = {
    lessThanXSeconds: {
      one: "less than a second",
      other: "less than {{count}} seconds"
    },
    xSeconds: {
      one: "1 second",
      other: "{{count}} seconds"
    },
    halfAMinute: "half a minute",
    lessThanXMinutes: {
      one: "less than a minute",
      other: "less than {{count}} minutes"
    },
    xMinutes: {
      one: "1 minute",
      other: "{{count}} minutes"
    },
    aboutXHours: {
      one: "about 1 hour",
      other: "about {{count}} hours"
    },
    xHours: {
      one: "1 hour",
      other: "{{count}} hours"
    },
    xDays: {
      one: "1 day",
      other: "{{count}} days"
    },
    aboutXWeeks: {
      one: "about 1 week",
      other: "about {{count}} weeks"
    },
    xWeeks: {
      one: "1 week",
      other: "{{count}} weeks"
    },
    aboutXMonths: {
      one: "about 1 month",
      other: "about {{count}} months"
    },
    xMonths: {
      one: "1 month",
      other: "{{count}} months"
    },
    aboutXYears: {
      one: "about 1 year",
      other: "about {{count}} years"
    },
    xYears: {
      one: "1 year",
      other: "{{count}} years"
    },
    overXYears: {
      one: "over 1 year",
      other: "over {{count}} years"
    },
    almostXYears: {
      one: "almost 1 year",
      other: "almost {{count}} years"
    }
  };
  var formatDistance = function(token, count, options) {
    var result;
    var tokenValue = formatDistanceLocale[token];
    if (typeof tokenValue === "string") {
      result = tokenValue;
    } else if (count === 1) {
      result = tokenValue.one;
    } else {
      result = tokenValue.other.replace("{{count}}", count.toString());
    }
    if (options !== null && options !== void 0 && options.addSuffix) {
      if (options.comparison && options.comparison > 0) {
        return "in " + result;
      } else {
        return result + " ago";
      }
    }
    return result;
  };
  var formatDistance_default = formatDistance;

  // node_modules/date-fns/esm/locale/_lib/buildFormatLongFn/index.js
  function buildFormatLongFn(args) {
    return function() {
      var options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      var width = options.width ? String(options.width) : args.defaultWidth;
      var format2 = args.formats[width] || args.formats[args.defaultWidth];
      return format2;
    };
  }

  // node_modules/date-fns/esm/locale/en-US/_lib/formatLong/index.js
  var dateFormats = {
    full: "EEEE, MMMM do, y",
    long: "MMMM do, y",
    medium: "MMM d, y",
    short: "MM/dd/yyyy"
  };
  var timeFormats = {
    full: "h:mm:ss a zzzz",
    long: "h:mm:ss a z",
    medium: "h:mm:ss a",
    short: "h:mm a"
  };
  var dateTimeFormats = {
    full: "{{date}} 'at' {{time}}",
    long: "{{date}} 'at' {{time}}",
    medium: "{{date}}, {{time}}",
    short: "{{date}}, {{time}}"
  };
  var formatLong = {
    date: buildFormatLongFn({
      formats: dateFormats,
      defaultWidth: "full"
    }),
    time: buildFormatLongFn({
      formats: timeFormats,
      defaultWidth: "full"
    }),
    dateTime: buildFormatLongFn({
      formats: dateTimeFormats,
      defaultWidth: "full"
    })
  };
  var formatLong_default = formatLong;

  // node_modules/date-fns/esm/locale/en-US/_lib/formatRelative/index.js
  var formatRelativeLocale = {
    lastWeek: "'last' eeee 'at' p",
    yesterday: "'yesterday at' p",
    today: "'today at' p",
    tomorrow: "'tomorrow at' p",
    nextWeek: "eeee 'at' p",
    other: "P"
  };
  var formatRelative = function(token, _date, _baseDate, _options) {
    return formatRelativeLocale[token];
  };
  var formatRelative_default = formatRelative;

  // node_modules/date-fns/esm/locale/_lib/buildLocalizeFn/index.js
  function buildLocalizeFn(args) {
    return function(dirtyIndex, dirtyOptions) {
      var options = dirtyOptions || {};
      var context = options.context ? String(options.context) : "standalone";
      var valuesArray;
      if (context === "formatting" && args.formattingValues) {
        var defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
        var width = options.width ? String(options.width) : defaultWidth;
        valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
      } else {
        var _defaultWidth = args.defaultWidth;
        var _width = options.width ? String(options.width) : args.defaultWidth;
        valuesArray = args.values[_width] || args.values[_defaultWidth];
      }
      var index = args.argumentCallback ? args.argumentCallback(dirtyIndex) : dirtyIndex;
      return valuesArray[index];
    };
  }

  // node_modules/date-fns/esm/locale/en-US/_lib/localize/index.js
  var eraValues = {
    narrow: ["B", "A"],
    abbreviated: ["BC", "AD"],
    wide: ["Before Christ", "Anno Domini"]
  };
  var quarterValues = {
    narrow: ["1", "2", "3", "4"],
    abbreviated: ["Q1", "Q2", "Q3", "Q4"],
    wide: ["1st quarter", "2nd quarter", "3rd quarter", "4th quarter"]
  };
  var monthValues = {
    narrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
    abbreviated: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    wide: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  };
  var dayValues = {
    narrow: ["S", "M", "T", "W", "T", "F", "S"],
    short: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    abbreviated: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    wide: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  };
  var dayPeriodValues = {
    narrow: {
      am: "a",
      pm: "p",
      midnight: "mi",
      noon: "n",
      morning: "morning",
      afternoon: "afternoon",
      evening: "evening",
      night: "night"
    },
    abbreviated: {
      am: "AM",
      pm: "PM",
      midnight: "midnight",
      noon: "noon",
      morning: "morning",
      afternoon: "afternoon",
      evening: "evening",
      night: "night"
    },
    wide: {
      am: "a.m.",
      pm: "p.m.",
      midnight: "midnight",
      noon: "noon",
      morning: "morning",
      afternoon: "afternoon",
      evening: "evening",
      night: "night"
    }
  };
  var formattingDayPeriodValues = {
    narrow: {
      am: "a",
      pm: "p",
      midnight: "mi",
      noon: "n",
      morning: "in the morning",
      afternoon: "in the afternoon",
      evening: "in the evening",
      night: "at night"
    },
    abbreviated: {
      am: "AM",
      pm: "PM",
      midnight: "midnight",
      noon: "noon",
      morning: "in the morning",
      afternoon: "in the afternoon",
      evening: "in the evening",
      night: "at night"
    },
    wide: {
      am: "a.m.",
      pm: "p.m.",
      midnight: "midnight",
      noon: "noon",
      morning: "in the morning",
      afternoon: "in the afternoon",
      evening: "in the evening",
      night: "at night"
    }
  };
  var ordinalNumber = function(dirtyNumber, _options) {
    var number = Number(dirtyNumber);
    var rem100 = number % 100;
    if (rem100 > 20 || rem100 < 10) {
      switch (rem100 % 10) {
        case 1:
          return number + "st";
        case 2:
          return number + "nd";
        case 3:
          return number + "rd";
      }
    }
    return number + "th";
  };
  var localize = {
    ordinalNumber,
    era: buildLocalizeFn({
      values: eraValues,
      defaultWidth: "wide"
    }),
    quarter: buildLocalizeFn({
      values: quarterValues,
      defaultWidth: "wide",
      argumentCallback: function(quarter) {
        return quarter - 1;
      }
    }),
    month: buildLocalizeFn({
      values: monthValues,
      defaultWidth: "wide"
    }),
    day: buildLocalizeFn({
      values: dayValues,
      defaultWidth: "wide"
    }),
    dayPeriod: buildLocalizeFn({
      values: dayPeriodValues,
      defaultWidth: "wide",
      formattingValues: formattingDayPeriodValues,
      defaultFormattingWidth: "wide"
    })
  };
  var localize_default = localize;

  // node_modules/date-fns/esm/locale/_lib/buildMatchFn/index.js
  function buildMatchFn(args) {
    return function(string) {
      var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      var width = options.width;
      var matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
      var matchResult = string.match(matchPattern);
      if (!matchResult) {
        return null;
      }
      var matchedString = matchResult[0];
      var parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
      var key = Array.isArray(parsePatterns) ? findIndex(parsePatterns, function(pattern) {
        return pattern.test(matchedString);
      }) : findKey(parsePatterns, function(pattern) {
        return pattern.test(matchedString);
      });
      var value;
      value = args.valueCallback ? args.valueCallback(key) : key;
      value = options.valueCallback ? options.valueCallback(value) : value;
      var rest = string.slice(matchedString.length);
      return {
        value,
        rest
      };
    };
  }
  function findKey(object, predicate) {
    for (var key in object) {
      if (object.hasOwnProperty(key) && predicate(object[key])) {
        return key;
      }
    }
    return void 0;
  }
  function findIndex(array, predicate) {
    for (var key = 0; key < array.length; key++) {
      if (predicate(array[key])) {
        return key;
      }
    }
    return void 0;
  }

  // node_modules/date-fns/esm/locale/_lib/buildMatchPatternFn/index.js
  function buildMatchPatternFn(args) {
    return function(string) {
      var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      var matchResult = string.match(args.matchPattern);
      if (!matchResult)
        return null;
      var matchedString = matchResult[0];
      var parseResult = string.match(args.parsePattern);
      if (!parseResult)
        return null;
      var value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
      value = options.valueCallback ? options.valueCallback(value) : value;
      var rest = string.slice(matchedString.length);
      return {
        value,
        rest
      };
    };
  }

  // node_modules/date-fns/esm/locale/en-US/_lib/match/index.js
  var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
  var parseOrdinalNumberPattern = /\d+/i;
  var matchEraPatterns = {
    narrow: /^(b|a)/i,
    abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
    wide: /^(before christ|before common era|anno domini|common era)/i
  };
  var parseEraPatterns = {
    any: [/^b/i, /^(a|c)/i]
  };
  var matchQuarterPatterns = {
    narrow: /^[1234]/i,
    abbreviated: /^q[1234]/i,
    wide: /^[1234](th|st|nd|rd)? quarter/i
  };
  var parseQuarterPatterns = {
    any: [/1/i, /2/i, /3/i, /4/i]
  };
  var matchMonthPatterns = {
    narrow: /^[jfmasond]/i,
    abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
  };
  var parseMonthPatterns = {
    narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^a/i, /^s/i, /^o/i, /^n/i, /^d/i],
    any: [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^au/i, /^s/i, /^o/i, /^n/i, /^d/i]
  };
  var matchDayPatterns = {
    narrow: /^[smtwf]/i,
    short: /^(su|mo|tu|we|th|fr|sa)/i,
    abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
    wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
  };
  var parseDayPatterns = {
    narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
    any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
  };
  var matchDayPeriodPatterns = {
    narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
    any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
  };
  var parseDayPeriodPatterns = {
    any: {
      am: /^a/i,
      pm: /^p/i,
      midnight: /^mi/i,
      noon: /^no/i,
      morning: /morning/i,
      afternoon: /afternoon/i,
      evening: /evening/i,
      night: /night/i
    }
  };
  var match = {
    ordinalNumber: buildMatchPatternFn({
      matchPattern: matchOrdinalNumberPattern,
      parsePattern: parseOrdinalNumberPattern,
      valueCallback: function(value) {
        return parseInt(value, 10);
      }
    }),
    era: buildMatchFn({
      matchPatterns: matchEraPatterns,
      defaultMatchWidth: "wide",
      parsePatterns: parseEraPatterns,
      defaultParseWidth: "any"
    }),
    quarter: buildMatchFn({
      matchPatterns: matchQuarterPatterns,
      defaultMatchWidth: "wide",
      parsePatterns: parseQuarterPatterns,
      defaultParseWidth: "any",
      valueCallback: function(index) {
        return index + 1;
      }
    }),
    month: buildMatchFn({
      matchPatterns: matchMonthPatterns,
      defaultMatchWidth: "wide",
      parsePatterns: parseMonthPatterns,
      defaultParseWidth: "any"
    }),
    day: buildMatchFn({
      matchPatterns: matchDayPatterns,
      defaultMatchWidth: "wide",
      parsePatterns: parseDayPatterns,
      defaultParseWidth: "any"
    }),
    dayPeriod: buildMatchFn({
      matchPatterns: matchDayPeriodPatterns,
      defaultMatchWidth: "any",
      parsePatterns: parseDayPeriodPatterns,
      defaultParseWidth: "any"
    })
  };
  var match_default = match;

  // node_modules/date-fns/esm/locale/en-US/index.js
  var locale = {
    code: "en-US",
    formatDistance: formatDistance_default,
    formatLong: formatLong_default,
    formatRelative: formatRelative_default,
    localize: localize_default,
    match: match_default,
    options: {
      weekStartsOn: 0,
      firstWeekContainsDate: 1
    }
  };
  var en_US_default = locale;

  // node_modules/date-fns/esm/subMilliseconds/index.js
  function subMilliseconds(dirtyDate, dirtyAmount) {
    requiredArgs(2, arguments);
    var amount = toInteger(dirtyAmount);
    return addMilliseconds(dirtyDate, -amount);
  }

  // node_modules/date-fns/esm/_lib/getUTCDayOfYear/index.js
  var MILLISECONDS_IN_DAY2 = 864e5;
  function getUTCDayOfYear(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    var timestamp = date.getTime();
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
    var startOfYearTimestamp = date.getTime();
    var difference = timestamp - startOfYearTimestamp;
    return Math.floor(difference / MILLISECONDS_IN_DAY2) + 1;
  }

  // node_modules/date-fns/esm/_lib/startOfUTCISOWeek/index.js
  function startOfUTCISOWeek(dirtyDate) {
    requiredArgs(1, arguments);
    var weekStartsOn = 1;
    var date = toDate(dirtyDate);
    var day = date.getUTCDay();
    var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    date.setUTCDate(date.getUTCDate() - diff);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  // node_modules/date-fns/esm/_lib/getUTCISOWeekYear/index.js
  function getUTCISOWeekYear(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    var year = date.getUTCFullYear();
    var fourthOfJanuaryOfNextYear = new Date(0);
    fourthOfJanuaryOfNextYear.setUTCFullYear(year + 1, 0, 4);
    fourthOfJanuaryOfNextYear.setUTCHours(0, 0, 0, 0);
    var startOfNextYear = startOfUTCISOWeek(fourthOfJanuaryOfNextYear);
    var fourthOfJanuaryOfThisYear = new Date(0);
    fourthOfJanuaryOfThisYear.setUTCFullYear(year, 0, 4);
    fourthOfJanuaryOfThisYear.setUTCHours(0, 0, 0, 0);
    var startOfThisYear = startOfUTCISOWeek(fourthOfJanuaryOfThisYear);
    if (date.getTime() >= startOfNextYear.getTime()) {
      return year + 1;
    } else if (date.getTime() >= startOfThisYear.getTime()) {
      return year;
    } else {
      return year - 1;
    }
  }

  // node_modules/date-fns/esm/_lib/startOfUTCISOWeekYear/index.js
  function startOfUTCISOWeekYear(dirtyDate) {
    requiredArgs(1, arguments);
    var year = getUTCISOWeekYear(dirtyDate);
    var fourthOfJanuary = new Date(0);
    fourthOfJanuary.setUTCFullYear(year, 0, 4);
    fourthOfJanuary.setUTCHours(0, 0, 0, 0);
    var date = startOfUTCISOWeek(fourthOfJanuary);
    return date;
  }

  // node_modules/date-fns/esm/_lib/getUTCISOWeek/index.js
  var MILLISECONDS_IN_WEEK = 6048e5;
  function getUTCISOWeek(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    var diff = startOfUTCISOWeek(date).getTime() - startOfUTCISOWeekYear(date).getTime();
    return Math.round(diff / MILLISECONDS_IN_WEEK) + 1;
  }

  // node_modules/date-fns/esm/_lib/startOfUTCWeek/index.js
  function startOfUTCWeek(dirtyDate, dirtyOptions) {
    requiredArgs(1, arguments);
    var options = dirtyOptions || {};
    var locale3 = options.locale;
    var localeWeekStartsOn = locale3 && locale3.options && locale3.options.weekStartsOn;
    var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
    var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn);
    if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
      throw new RangeError("weekStartsOn must be between 0 and 6 inclusively");
    }
    var date = toDate(dirtyDate);
    var day = date.getUTCDay();
    var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    date.setUTCDate(date.getUTCDate() - diff);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  // node_modules/date-fns/esm/_lib/getUTCWeekYear/index.js
  function getUTCWeekYear(dirtyDate, dirtyOptions) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    var year = date.getUTCFullYear();
    var options = dirtyOptions || {};
    var locale3 = options.locale;
    var localeFirstWeekContainsDate = locale3 && locale3.options && locale3.options.firstWeekContainsDate;
    var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
    var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate);
    if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
      throw new RangeError("firstWeekContainsDate must be between 1 and 7 inclusively");
    }
    var firstWeekOfNextYear = new Date(0);
    firstWeekOfNextYear.setUTCFullYear(year + 1, 0, firstWeekContainsDate);
    firstWeekOfNextYear.setUTCHours(0, 0, 0, 0);
    var startOfNextYear = startOfUTCWeek(firstWeekOfNextYear, dirtyOptions);
    var firstWeekOfThisYear = new Date(0);
    firstWeekOfThisYear.setUTCFullYear(year, 0, firstWeekContainsDate);
    firstWeekOfThisYear.setUTCHours(0, 0, 0, 0);
    var startOfThisYear = startOfUTCWeek(firstWeekOfThisYear, dirtyOptions);
    if (date.getTime() >= startOfNextYear.getTime()) {
      return year + 1;
    } else if (date.getTime() >= startOfThisYear.getTime()) {
      return year;
    } else {
      return year - 1;
    }
  }

  // node_modules/date-fns/esm/_lib/startOfUTCWeekYear/index.js
  function startOfUTCWeekYear(dirtyDate, dirtyOptions) {
    requiredArgs(1, arguments);
    var options = dirtyOptions || {};
    var locale3 = options.locale;
    var localeFirstWeekContainsDate = locale3 && locale3.options && locale3.options.firstWeekContainsDate;
    var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
    var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate);
    var year = getUTCWeekYear(dirtyDate, dirtyOptions);
    var firstWeek = new Date(0);
    firstWeek.setUTCFullYear(year, 0, firstWeekContainsDate);
    firstWeek.setUTCHours(0, 0, 0, 0);
    var date = startOfUTCWeek(firstWeek, dirtyOptions);
    return date;
  }

  // node_modules/date-fns/esm/_lib/getUTCWeek/index.js
  var MILLISECONDS_IN_WEEK2 = 6048e5;
  function getUTCWeek(dirtyDate, options) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    var diff = startOfUTCWeek(date, options).getTime() - startOfUTCWeekYear(date, options).getTime();
    return Math.round(diff / MILLISECONDS_IN_WEEK2) + 1;
  }

  // node_modules/date-fns/esm/_lib/addLeadingZeros/index.js
  function addLeadingZeros(number, targetLength) {
    var sign2 = number < 0 ? "-" : "";
    var output = Math.abs(number).toString();
    while (output.length < targetLength) {
      output = "0" + output;
    }
    return sign2 + output;
  }

  // node_modules/date-fns/esm/_lib/format/lightFormatters/index.js
  var formatters2 = {
    y: function(date, token) {
      var signedYear = date.getUTCFullYear();
      var year = signedYear > 0 ? signedYear : 1 - signedYear;
      return addLeadingZeros(token === "yy" ? year % 100 : year, token.length);
    },
    M: function(date, token) {
      var month = date.getUTCMonth();
      return token === "M" ? String(month + 1) : addLeadingZeros(month + 1, 2);
    },
    d: function(date, token) {
      return addLeadingZeros(date.getUTCDate(), token.length);
    },
    a: function(date, token) {
      var dayPeriodEnumValue = date.getUTCHours() / 12 >= 1 ? "pm" : "am";
      switch (token) {
        case "a":
        case "aa":
          return dayPeriodEnumValue.toUpperCase();
        case "aaa":
          return dayPeriodEnumValue;
        case "aaaaa":
          return dayPeriodEnumValue[0];
        case "aaaa":
        default:
          return dayPeriodEnumValue === "am" ? "a.m." : "p.m.";
      }
    },
    h: function(date, token) {
      return addLeadingZeros(date.getUTCHours() % 12 || 12, token.length);
    },
    H: function(date, token) {
      return addLeadingZeros(date.getUTCHours(), token.length);
    },
    m: function(date, token) {
      return addLeadingZeros(date.getUTCMinutes(), token.length);
    },
    s: function(date, token) {
      return addLeadingZeros(date.getUTCSeconds(), token.length);
    },
    S: function(date, token) {
      var numberOfDigits = token.length;
      var milliseconds = date.getUTCMilliseconds();
      var fractionalSeconds = Math.floor(milliseconds * Math.pow(10, numberOfDigits - 3));
      return addLeadingZeros(fractionalSeconds, token.length);
    }
  };
  var lightFormatters_default = formatters2;

  // node_modules/date-fns/esm/_lib/format/formatters/index.js
  var dayPeriodEnum = {
    am: "am",
    pm: "pm",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  };
  var formatters3 = {
    G: function(date, token, localize3) {
      var era = date.getUTCFullYear() > 0 ? 1 : 0;
      switch (token) {
        case "G":
        case "GG":
        case "GGG":
          return localize3.era(era, {
            width: "abbreviated"
          });
        case "GGGGG":
          return localize3.era(era, {
            width: "narrow"
          });
        case "GGGG":
        default:
          return localize3.era(era, {
            width: "wide"
          });
      }
    },
    y: function(date, token, localize3) {
      if (token === "yo") {
        var signedYear = date.getUTCFullYear();
        var year = signedYear > 0 ? signedYear : 1 - signedYear;
        return localize3.ordinalNumber(year, {
          unit: "year"
        });
      }
      return lightFormatters_default.y(date, token);
    },
    Y: function(date, token, localize3, options) {
      var signedWeekYear = getUTCWeekYear(date, options);
      var weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear;
      if (token === "YY") {
        var twoDigitYear = weekYear % 100;
        return addLeadingZeros(twoDigitYear, 2);
      }
      if (token === "Yo") {
        return localize3.ordinalNumber(weekYear, {
          unit: "year"
        });
      }
      return addLeadingZeros(weekYear, token.length);
    },
    R: function(date, token) {
      var isoWeekYear = getUTCISOWeekYear(date);
      return addLeadingZeros(isoWeekYear, token.length);
    },
    u: function(date, token) {
      var year = date.getUTCFullYear();
      return addLeadingZeros(year, token.length);
    },
    Q: function(date, token, localize3) {
      var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);
      switch (token) {
        case "Q":
          return String(quarter);
        case "QQ":
          return addLeadingZeros(quarter, 2);
        case "Qo":
          return localize3.ordinalNumber(quarter, {
            unit: "quarter"
          });
        case "QQQ":
          return localize3.quarter(quarter, {
            width: "abbreviated",
            context: "formatting"
          });
        case "QQQQQ":
          return localize3.quarter(quarter, {
            width: "narrow",
            context: "formatting"
          });
        case "QQQQ":
        default:
          return localize3.quarter(quarter, {
            width: "wide",
            context: "formatting"
          });
      }
    },
    q: function(date, token, localize3) {
      var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);
      switch (token) {
        case "q":
          return String(quarter);
        case "qq":
          return addLeadingZeros(quarter, 2);
        case "qo":
          return localize3.ordinalNumber(quarter, {
            unit: "quarter"
          });
        case "qqq":
          return localize3.quarter(quarter, {
            width: "abbreviated",
            context: "standalone"
          });
        case "qqqqq":
          return localize3.quarter(quarter, {
            width: "narrow",
            context: "standalone"
          });
        case "qqqq":
        default:
          return localize3.quarter(quarter, {
            width: "wide",
            context: "standalone"
          });
      }
    },
    M: function(date, token, localize3) {
      var month = date.getUTCMonth();
      switch (token) {
        case "M":
        case "MM":
          return lightFormatters_default.M(date, token);
        case "Mo":
          return localize3.ordinalNumber(month + 1, {
            unit: "month"
          });
        case "MMM":
          return localize3.month(month, {
            width: "abbreviated",
            context: "formatting"
          });
        case "MMMMM":
          return localize3.month(month, {
            width: "narrow",
            context: "formatting"
          });
        case "MMMM":
        default:
          return localize3.month(month, {
            width: "wide",
            context: "formatting"
          });
      }
    },
    L: function(date, token, localize3) {
      var month = date.getUTCMonth();
      switch (token) {
        case "L":
          return String(month + 1);
        case "LL":
          return addLeadingZeros(month + 1, 2);
        case "Lo":
          return localize3.ordinalNumber(month + 1, {
            unit: "month"
          });
        case "LLL":
          return localize3.month(month, {
            width: "abbreviated",
            context: "standalone"
          });
        case "LLLLL":
          return localize3.month(month, {
            width: "narrow",
            context: "standalone"
          });
        case "LLLL":
        default:
          return localize3.month(month, {
            width: "wide",
            context: "standalone"
          });
      }
    },
    w: function(date, token, localize3, options) {
      var week = getUTCWeek(date, options);
      if (token === "wo") {
        return localize3.ordinalNumber(week, {
          unit: "week"
        });
      }
      return addLeadingZeros(week, token.length);
    },
    I: function(date, token, localize3) {
      var isoWeek = getUTCISOWeek(date);
      if (token === "Io") {
        return localize3.ordinalNumber(isoWeek, {
          unit: "week"
        });
      }
      return addLeadingZeros(isoWeek, token.length);
    },
    d: function(date, token, localize3) {
      if (token === "do") {
        return localize3.ordinalNumber(date.getUTCDate(), {
          unit: "date"
        });
      }
      return lightFormatters_default.d(date, token);
    },
    D: function(date, token, localize3) {
      var dayOfYear = getUTCDayOfYear(date);
      if (token === "Do") {
        return localize3.ordinalNumber(dayOfYear, {
          unit: "dayOfYear"
        });
      }
      return addLeadingZeros(dayOfYear, token.length);
    },
    E: function(date, token, localize3) {
      var dayOfWeek = date.getUTCDay();
      switch (token) {
        case "E":
        case "EE":
        case "EEE":
          return localize3.day(dayOfWeek, {
            width: "abbreviated",
            context: "formatting"
          });
        case "EEEEE":
          return localize3.day(dayOfWeek, {
            width: "narrow",
            context: "formatting"
          });
        case "EEEEEE":
          return localize3.day(dayOfWeek, {
            width: "short",
            context: "formatting"
          });
        case "EEEE":
        default:
          return localize3.day(dayOfWeek, {
            width: "wide",
            context: "formatting"
          });
      }
    },
    e: function(date, token, localize3, options) {
      var dayOfWeek = date.getUTCDay();
      var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
      switch (token) {
        case "e":
          return String(localDayOfWeek);
        case "ee":
          return addLeadingZeros(localDayOfWeek, 2);
        case "eo":
          return localize3.ordinalNumber(localDayOfWeek, {
            unit: "day"
          });
        case "eee":
          return localize3.day(dayOfWeek, {
            width: "abbreviated",
            context: "formatting"
          });
        case "eeeee":
          return localize3.day(dayOfWeek, {
            width: "narrow",
            context: "formatting"
          });
        case "eeeeee":
          return localize3.day(dayOfWeek, {
            width: "short",
            context: "formatting"
          });
        case "eeee":
        default:
          return localize3.day(dayOfWeek, {
            width: "wide",
            context: "formatting"
          });
      }
    },
    c: function(date, token, localize3, options) {
      var dayOfWeek = date.getUTCDay();
      var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
      switch (token) {
        case "c":
          return String(localDayOfWeek);
        case "cc":
          return addLeadingZeros(localDayOfWeek, token.length);
        case "co":
          return localize3.ordinalNumber(localDayOfWeek, {
            unit: "day"
          });
        case "ccc":
          return localize3.day(dayOfWeek, {
            width: "abbreviated",
            context: "standalone"
          });
        case "ccccc":
          return localize3.day(dayOfWeek, {
            width: "narrow",
            context: "standalone"
          });
        case "cccccc":
          return localize3.day(dayOfWeek, {
            width: "short",
            context: "standalone"
          });
        case "cccc":
        default:
          return localize3.day(dayOfWeek, {
            width: "wide",
            context: "standalone"
          });
      }
    },
    i: function(date, token, localize3) {
      var dayOfWeek = date.getUTCDay();
      var isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      switch (token) {
        case "i":
          return String(isoDayOfWeek);
        case "ii":
          return addLeadingZeros(isoDayOfWeek, token.length);
        case "io":
          return localize3.ordinalNumber(isoDayOfWeek, {
            unit: "day"
          });
        case "iii":
          return localize3.day(dayOfWeek, {
            width: "abbreviated",
            context: "formatting"
          });
        case "iiiii":
          return localize3.day(dayOfWeek, {
            width: "narrow",
            context: "formatting"
          });
        case "iiiiii":
          return localize3.day(dayOfWeek, {
            width: "short",
            context: "formatting"
          });
        case "iiii":
        default:
          return localize3.day(dayOfWeek, {
            width: "wide",
            context: "formatting"
          });
      }
    },
    a: function(date, token, localize3) {
      var hours = date.getUTCHours();
      var dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
      switch (token) {
        case "a":
        case "aa":
          return localize3.dayPeriod(dayPeriodEnumValue, {
            width: "abbreviated",
            context: "formatting"
          });
        case "aaa":
          return localize3.dayPeriod(dayPeriodEnumValue, {
            width: "abbreviated",
            context: "formatting"
          }).toLowerCase();
        case "aaaaa":
          return localize3.dayPeriod(dayPeriodEnumValue, {
            width: "narrow",
            context: "formatting"
          });
        case "aaaa":
        default:
          return localize3.dayPeriod(dayPeriodEnumValue, {
            width: "wide",
            context: "formatting"
          });
      }
    },
    b: function(date, token, localize3) {
      var hours = date.getUTCHours();
      var dayPeriodEnumValue;
      if (hours === 12) {
        dayPeriodEnumValue = dayPeriodEnum.noon;
      } else if (hours === 0) {
        dayPeriodEnumValue = dayPeriodEnum.midnight;
      } else {
        dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
      }
      switch (token) {
        case "b":
        case "bb":
          return localize3.dayPeriod(dayPeriodEnumValue, {
            width: "abbreviated",
            context: "formatting"
          });
        case "bbb":
          return localize3.dayPeriod(dayPeriodEnumValue, {
            width: "abbreviated",
            context: "formatting"
          }).toLowerCase();
        case "bbbbb":
          return localize3.dayPeriod(dayPeriodEnumValue, {
            width: "narrow",
            context: "formatting"
          });
        case "bbbb":
        default:
          return localize3.dayPeriod(dayPeriodEnumValue, {
            width: "wide",
            context: "formatting"
          });
      }
    },
    B: function(date, token, localize3) {
      var hours = date.getUTCHours();
      var dayPeriodEnumValue;
      if (hours >= 17) {
        dayPeriodEnumValue = dayPeriodEnum.evening;
      } else if (hours >= 12) {
        dayPeriodEnumValue = dayPeriodEnum.afternoon;
      } else if (hours >= 4) {
        dayPeriodEnumValue = dayPeriodEnum.morning;
      } else {
        dayPeriodEnumValue = dayPeriodEnum.night;
      }
      switch (token) {
        case "B":
        case "BB":
        case "BBB":
          return localize3.dayPeriod(dayPeriodEnumValue, {
            width: "abbreviated",
            context: "formatting"
          });
        case "BBBBB":
          return localize3.dayPeriod(dayPeriodEnumValue, {
            width: "narrow",
            context: "formatting"
          });
        case "BBBB":
        default:
          return localize3.dayPeriod(dayPeriodEnumValue, {
            width: "wide",
            context: "formatting"
          });
      }
    },
    h: function(date, token, localize3) {
      if (token === "ho") {
        var hours = date.getUTCHours() % 12;
        if (hours === 0)
          hours = 12;
        return localize3.ordinalNumber(hours, {
          unit: "hour"
        });
      }
      return lightFormatters_default.h(date, token);
    },
    H: function(date, token, localize3) {
      if (token === "Ho") {
        return localize3.ordinalNumber(date.getUTCHours(), {
          unit: "hour"
        });
      }
      return lightFormatters_default.H(date, token);
    },
    K: function(date, token, localize3) {
      var hours = date.getUTCHours() % 12;
      if (token === "Ko") {
        return localize3.ordinalNumber(hours, {
          unit: "hour"
        });
      }
      return addLeadingZeros(hours, token.length);
    },
    k: function(date, token, localize3) {
      var hours = date.getUTCHours();
      if (hours === 0)
        hours = 24;
      if (token === "ko") {
        return localize3.ordinalNumber(hours, {
          unit: "hour"
        });
      }
      return addLeadingZeros(hours, token.length);
    },
    m: function(date, token, localize3) {
      if (token === "mo") {
        return localize3.ordinalNumber(date.getUTCMinutes(), {
          unit: "minute"
        });
      }
      return lightFormatters_default.m(date, token);
    },
    s: function(date, token, localize3) {
      if (token === "so") {
        return localize3.ordinalNumber(date.getUTCSeconds(), {
          unit: "second"
        });
      }
      return lightFormatters_default.s(date, token);
    },
    S: function(date, token) {
      return lightFormatters_default.S(date, token);
    },
    X: function(date, token, _localize, options) {
      var originalDate = options._originalDate || date;
      var timezoneOffset = originalDate.getTimezoneOffset();
      if (timezoneOffset === 0) {
        return "Z";
      }
      switch (token) {
        case "X":
          return formatTimezoneWithOptionalMinutes(timezoneOffset);
        case "XXXX":
        case "XX":
          return formatTimezone(timezoneOffset);
        case "XXXXX":
        case "XXX":
        default:
          return formatTimezone(timezoneOffset, ":");
      }
    },
    x: function(date, token, _localize, options) {
      var originalDate = options._originalDate || date;
      var timezoneOffset = originalDate.getTimezoneOffset();
      switch (token) {
        case "x":
          return formatTimezoneWithOptionalMinutes(timezoneOffset);
        case "xxxx":
        case "xx":
          return formatTimezone(timezoneOffset);
        case "xxxxx":
        case "xxx":
        default:
          return formatTimezone(timezoneOffset, ":");
      }
    },
    O: function(date, token, _localize, options) {
      var originalDate = options._originalDate || date;
      var timezoneOffset = originalDate.getTimezoneOffset();
      switch (token) {
        case "O":
        case "OO":
        case "OOO":
          return "GMT" + formatTimezoneShort(timezoneOffset, ":");
        case "OOOO":
        default:
          return "GMT" + formatTimezone(timezoneOffset, ":");
      }
    },
    z: function(date, token, _localize, options) {
      var originalDate = options._originalDate || date;
      var timezoneOffset = originalDate.getTimezoneOffset();
      switch (token) {
        case "z":
        case "zz":
        case "zzz":
          return "GMT" + formatTimezoneShort(timezoneOffset, ":");
        case "zzzz":
        default:
          return "GMT" + formatTimezone(timezoneOffset, ":");
      }
    },
    t: function(date, token, _localize, options) {
      var originalDate = options._originalDate || date;
      var timestamp = Math.floor(originalDate.getTime() / 1e3);
      return addLeadingZeros(timestamp, token.length);
    },
    T: function(date, token, _localize, options) {
      var originalDate = options._originalDate || date;
      var timestamp = originalDate.getTime();
      return addLeadingZeros(timestamp, token.length);
    }
  };
  function formatTimezoneShort(offset, dirtyDelimiter) {
    var sign2 = offset > 0 ? "-" : "+";
    var absOffset = Math.abs(offset);
    var hours = Math.floor(absOffset / 60);
    var minutes = absOffset % 60;
    if (minutes === 0) {
      return sign2 + String(hours);
    }
    var delimiter = dirtyDelimiter || "";
    return sign2 + String(hours) + delimiter + addLeadingZeros(minutes, 2);
  }
  function formatTimezoneWithOptionalMinutes(offset, dirtyDelimiter) {
    if (offset % 60 === 0) {
      var sign2 = offset > 0 ? "-" : "+";
      return sign2 + addLeadingZeros(Math.abs(offset) / 60, 2);
    }
    return formatTimezone(offset, dirtyDelimiter);
  }
  function formatTimezone(offset, dirtyDelimiter) {
    var delimiter = dirtyDelimiter || "";
    var sign2 = offset > 0 ? "-" : "+";
    var absOffset = Math.abs(offset);
    var hours = addLeadingZeros(Math.floor(absOffset / 60), 2);
    var minutes = addLeadingZeros(absOffset % 60, 2);
    return sign2 + hours + delimiter + minutes;
  }
  var formatters_default = formatters3;

  // node_modules/date-fns/esm/_lib/format/longFormatters/index.js
  function dateLongFormatter(pattern, formatLong3) {
    switch (pattern) {
      case "P":
        return formatLong3.date({
          width: "short"
        });
      case "PP":
        return formatLong3.date({
          width: "medium"
        });
      case "PPP":
        return formatLong3.date({
          width: "long"
        });
      case "PPPP":
      default:
        return formatLong3.date({
          width: "full"
        });
    }
  }
  function timeLongFormatter(pattern, formatLong3) {
    switch (pattern) {
      case "p":
        return formatLong3.time({
          width: "short"
        });
      case "pp":
        return formatLong3.time({
          width: "medium"
        });
      case "ppp":
        return formatLong3.time({
          width: "long"
        });
      case "pppp":
      default:
        return formatLong3.time({
          width: "full"
        });
    }
  }
  function dateTimeLongFormatter(pattern, formatLong3) {
    var matchResult = pattern.match(/(P+)(p+)?/) || [];
    var datePattern = matchResult[1];
    var timePattern = matchResult[2];
    if (!timePattern) {
      return dateLongFormatter(pattern, formatLong3);
    }
    var dateTimeFormat;
    switch (datePattern) {
      case "P":
        dateTimeFormat = formatLong3.dateTime({
          width: "short"
        });
        break;
      case "PP":
        dateTimeFormat = formatLong3.dateTime({
          width: "medium"
        });
        break;
      case "PPP":
        dateTimeFormat = formatLong3.dateTime({
          width: "long"
        });
        break;
      case "PPPP":
      default:
        dateTimeFormat = formatLong3.dateTime({
          width: "full"
        });
        break;
    }
    return dateTimeFormat.replace("{{date}}", dateLongFormatter(datePattern, formatLong3)).replace("{{time}}", timeLongFormatter(timePattern, formatLong3));
  }
  var longFormatters = {
    p: timeLongFormatter,
    P: dateTimeLongFormatter
  };
  var longFormatters_default = longFormatters;

  // node_modules/date-fns/esm/_lib/protectedTokens/index.js
  var protectedDayOfYearTokens = ["D", "DD"];
  var protectedWeekYearTokens = ["YY", "YYYY"];
  function isProtectedDayOfYearToken(token) {
    return protectedDayOfYearTokens.indexOf(token) !== -1;
  }
  function isProtectedWeekYearToken(token) {
    return protectedWeekYearTokens.indexOf(token) !== -1;
  }
  function throwProtectedError(token, format2, input) {
    if (token === "YYYY") {
      throw new RangeError("Use `yyyy` instead of `YYYY` (in `".concat(format2, "`) for formatting years to the input `").concat(input, "`; see: https://git.io/fxCyr"));
    } else if (token === "YY") {
      throw new RangeError("Use `yy` instead of `YY` (in `".concat(format2, "`) for formatting years to the input `").concat(input, "`; see: https://git.io/fxCyr"));
    } else if (token === "D") {
      throw new RangeError("Use `d` instead of `D` (in `".concat(format2, "`) for formatting days of the month to the input `").concat(input, "`; see: https://git.io/fxCyr"));
    } else if (token === "DD") {
      throw new RangeError("Use `dd` instead of `DD` (in `".concat(format2, "`) for formatting days of the month to the input `").concat(input, "`; see: https://git.io/fxCyr"));
    }
  }

  // node_modules/date-fns/esm/format/index.js
  var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g;
  var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
  var escapedStringRegExp = /^'([^]*?)'?$/;
  var doubleQuoteRegExp = /''/g;
  var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
  function format(dirtyDate, dirtyFormatStr, dirtyOptions) {
    requiredArgs(2, arguments);
    var formatStr = String(dirtyFormatStr);
    var options = dirtyOptions || {};
    var locale3 = options.locale || en_US_default;
    var localeFirstWeekContainsDate = locale3.options && locale3.options.firstWeekContainsDate;
    var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
    var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate);
    if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
      throw new RangeError("firstWeekContainsDate must be between 1 and 7 inclusively");
    }
    var localeWeekStartsOn = locale3.options && locale3.options.weekStartsOn;
    var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
    var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn);
    if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
      throw new RangeError("weekStartsOn must be between 0 and 6 inclusively");
    }
    if (!locale3.localize) {
      throw new RangeError("locale must contain localize property");
    }
    if (!locale3.formatLong) {
      throw new RangeError("locale must contain formatLong property");
    }
    var originalDate = toDate(dirtyDate);
    if (!isValid(originalDate)) {
      throw new RangeError("Invalid time value");
    }
    var timezoneOffset = getTimezoneOffsetInMilliseconds(originalDate);
    var utcDate = subMilliseconds(originalDate, timezoneOffset);
    var formatterOptions = {
      firstWeekContainsDate,
      weekStartsOn,
      locale: locale3,
      _originalDate: originalDate
    };
    var result = formatStr.match(longFormattingTokensRegExp).map(function(substring) {
      var firstCharacter = substring[0];
      if (firstCharacter === "p" || firstCharacter === "P") {
        var longFormatter = longFormatters_default[firstCharacter];
        return longFormatter(substring, locale3.formatLong, formatterOptions);
      }
      return substring;
    }).join("").match(formattingTokensRegExp).map(function(substring) {
      if (substring === "''") {
        return "'";
      }
      var firstCharacter = substring[0];
      if (firstCharacter === "'") {
        return cleanEscapedString(substring);
      }
      var formatter = formatters_default[firstCharacter];
      if (formatter) {
        if (!options.useAdditionalWeekYearTokens && isProtectedWeekYearToken(substring)) {
          throwProtectedError(substring, dirtyFormatStr, dirtyDate);
        }
        if (!options.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(substring)) {
          throwProtectedError(substring, dirtyFormatStr, dirtyDate);
        }
        return formatter(utcDate, substring, locale3.localize, formatterOptions);
      }
      if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
        throw new RangeError("Format string contains an unescaped latin alphabet character `" + firstCharacter + "`");
      }
      return substring;
    }).join("");
    return result;
  }
  function cleanEscapedString(input) {
    return input.match(escapedStringRegExp)[1].replace(doubleQuoteRegExp, "'");
  }

  // node_modules/date-fns/esm/_lib/assign/index.js
  function assign(target, dirtyObject) {
    if (target == null) {
      throw new TypeError("assign requires that input parameter not be null or undefined");
    }
    dirtyObject = dirtyObject || {};
    for (var property in dirtyObject) {
      if (Object.prototype.hasOwnProperty.call(dirtyObject, property)) {
        target[property] = dirtyObject[property];
      }
    }
    return target;
  }

  // node_modules/date-fns/esm/_lib/setUTCDay/index.js
  function setUTCDay(dirtyDate, dirtyDay, dirtyOptions) {
    requiredArgs(2, arguments);
    var options = dirtyOptions || {};
    var locale3 = options.locale;
    var localeWeekStartsOn = locale3 && locale3.options && locale3.options.weekStartsOn;
    var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
    var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn);
    if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
      throw new RangeError("weekStartsOn must be between 0 and 6 inclusively");
    }
    var date = toDate(dirtyDate);
    var day = toInteger(dirtyDay);
    var currentDay = date.getUTCDay();
    var remainder = day % 7;
    var dayIndex = (remainder + 7) % 7;
    var diff = (dayIndex < weekStartsOn ? 7 : 0) + day - currentDay;
    date.setUTCDate(date.getUTCDate() + diff);
    return date;
  }

  // node_modules/date-fns/esm/_lib/setUTCISODay/index.js
  function setUTCISODay(dirtyDate, dirtyDay) {
    requiredArgs(2, arguments);
    var day = toInteger(dirtyDay);
    if (day % 7 === 0) {
      day = day - 7;
    }
    var weekStartsOn = 1;
    var date = toDate(dirtyDate);
    var currentDay = date.getUTCDay();
    var remainder = day % 7;
    var dayIndex = (remainder + 7) % 7;
    var diff = (dayIndex < weekStartsOn ? 7 : 0) + day - currentDay;
    date.setUTCDate(date.getUTCDate() + diff);
    return date;
  }

  // node_modules/date-fns/esm/_lib/setUTCISOWeek/index.js
  function setUTCISOWeek(dirtyDate, dirtyISOWeek) {
    requiredArgs(2, arguments);
    var date = toDate(dirtyDate);
    var isoWeek = toInteger(dirtyISOWeek);
    var diff = getUTCISOWeek(date) - isoWeek;
    date.setUTCDate(date.getUTCDate() - diff * 7);
    return date;
  }

  // node_modules/date-fns/esm/_lib/setUTCWeek/index.js
  function setUTCWeek(dirtyDate, dirtyWeek, options) {
    requiredArgs(2, arguments);
    var date = toDate(dirtyDate);
    var week = toInteger(dirtyWeek);
    var diff = getUTCWeek(date, options) - week;
    date.setUTCDate(date.getUTCDate() - diff * 7);
    return date;
  }

  // node_modules/date-fns/esm/parse/_lib/parsers/index.js
  var MILLISECONDS_IN_HOUR2 = 36e5;
  var MILLISECONDS_IN_MINUTE2 = 6e4;
  var MILLISECONDS_IN_SECOND = 1e3;
  var numericPatterns = {
    month: /^(1[0-2]|0?\d)/,
    date: /^(3[0-1]|[0-2]?\d)/,
    dayOfYear: /^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,
    week: /^(5[0-3]|[0-4]?\d)/,
    hour23h: /^(2[0-3]|[0-1]?\d)/,
    hour24h: /^(2[0-4]|[0-1]?\d)/,
    hour11h: /^(1[0-1]|0?\d)/,
    hour12h: /^(1[0-2]|0?\d)/,
    minute: /^[0-5]?\d/,
    second: /^[0-5]?\d/,
    singleDigit: /^\d/,
    twoDigits: /^\d{1,2}/,
    threeDigits: /^\d{1,3}/,
    fourDigits: /^\d{1,4}/,
    anyDigitsSigned: /^-?\d+/,
    singleDigitSigned: /^-?\d/,
    twoDigitsSigned: /^-?\d{1,2}/,
    threeDigitsSigned: /^-?\d{1,3}/,
    fourDigitsSigned: /^-?\d{1,4}/
  };
  var timezonePatterns = {
    basicOptionalMinutes: /^([+-])(\d{2})(\d{2})?|Z/,
    basic: /^([+-])(\d{2})(\d{2})|Z/,
    basicOptionalSeconds: /^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,
    extended: /^([+-])(\d{2}):(\d{2})|Z/,
    extendedOptionalSeconds: /^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/
  };
  function parseNumericPattern(pattern, string, valueCallback) {
    var matchResult = string.match(pattern);
    if (!matchResult) {
      return null;
    }
    var value = parseInt(matchResult[0], 10);
    return {
      value: valueCallback ? valueCallback(value) : value,
      rest: string.slice(matchResult[0].length)
    };
  }
  function parseTimezonePattern(pattern, string) {
    var matchResult = string.match(pattern);
    if (!matchResult) {
      return null;
    }
    if (matchResult[0] === "Z") {
      return {
        value: 0,
        rest: string.slice(1)
      };
    }
    var sign2 = matchResult[1] === "+" ? 1 : -1;
    var hours = matchResult[2] ? parseInt(matchResult[2], 10) : 0;
    var minutes = matchResult[3] ? parseInt(matchResult[3], 10) : 0;
    var seconds = matchResult[5] ? parseInt(matchResult[5], 10) : 0;
    return {
      value: sign2 * (hours * MILLISECONDS_IN_HOUR2 + minutes * MILLISECONDS_IN_MINUTE2 + seconds * MILLISECONDS_IN_SECOND),
      rest: string.slice(matchResult[0].length)
    };
  }
  function parseAnyDigitsSigned(string, valueCallback) {
    return parseNumericPattern(numericPatterns.anyDigitsSigned, string, valueCallback);
  }
  function parseNDigits(n3, string, valueCallback) {
    switch (n3) {
      case 1:
        return parseNumericPattern(numericPatterns.singleDigit, string, valueCallback);
      case 2:
        return parseNumericPattern(numericPatterns.twoDigits, string, valueCallback);
      case 3:
        return parseNumericPattern(numericPatterns.threeDigits, string, valueCallback);
      case 4:
        return parseNumericPattern(numericPatterns.fourDigits, string, valueCallback);
      default:
        return parseNumericPattern(new RegExp("^\\d{1," + n3 + "}"), string, valueCallback);
    }
  }
  function parseNDigitsSigned(n3, string, valueCallback) {
    switch (n3) {
      case 1:
        return parseNumericPattern(numericPatterns.singleDigitSigned, string, valueCallback);
      case 2:
        return parseNumericPattern(numericPatterns.twoDigitsSigned, string, valueCallback);
      case 3:
        return parseNumericPattern(numericPatterns.threeDigitsSigned, string, valueCallback);
      case 4:
        return parseNumericPattern(numericPatterns.fourDigitsSigned, string, valueCallback);
      default:
        return parseNumericPattern(new RegExp("^-?\\d{1," + n3 + "}"), string, valueCallback);
    }
  }
  function dayPeriodEnumToHours(enumValue) {
    switch (enumValue) {
      case "morning":
        return 4;
      case "evening":
        return 17;
      case "pm":
      case "noon":
      case "afternoon":
        return 12;
      case "am":
      case "midnight":
      case "night":
      default:
        return 0;
    }
  }
  function normalizeTwoDigitYear(twoDigitYear, currentYear) {
    var isCommonEra = currentYear > 0;
    var absCurrentYear = isCommonEra ? currentYear : 1 - currentYear;
    var result;
    if (absCurrentYear <= 50) {
      result = twoDigitYear || 100;
    } else {
      var rangeEnd = absCurrentYear + 50;
      var rangeEndCentury = Math.floor(rangeEnd / 100) * 100;
      var isPreviousCentury = twoDigitYear >= rangeEnd % 100;
      result = twoDigitYear + rangeEndCentury - (isPreviousCentury ? 100 : 0);
    }
    return isCommonEra ? result : 1 - result;
  }
  var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var DAYS_IN_MONTH_LEAP_YEAR = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function isLeapYearIndex(year) {
    return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
  }
  var parsers = {
    G: {
      priority: 140,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "G":
          case "GG":
          case "GGG":
            return match3.era(string, {
              width: "abbreviated"
            }) || match3.era(string, {
              width: "narrow"
            });
          case "GGGGG":
            return match3.era(string, {
              width: "narrow"
            });
          case "GGGG":
          default:
            return match3.era(string, {
              width: "wide"
            }) || match3.era(string, {
              width: "abbreviated"
            }) || match3.era(string, {
              width: "narrow"
            });
        }
      },
      set: function(date, flags, value, _options) {
        flags.era = value;
        date.setUTCFullYear(value, 0, 1);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["R", "u", "t", "T"]
    },
    y: {
      priority: 130,
      parse: function(string, token, match3, _options) {
        var valueCallback = function(year) {
          return {
            year,
            isTwoDigitYear: token === "yy"
          };
        };
        switch (token) {
          case "y":
            return parseNDigits(4, string, valueCallback);
          case "yo":
            return match3.ordinalNumber(string, {
              unit: "year",
              valueCallback
            });
          default:
            return parseNDigits(token.length, string, valueCallback);
        }
      },
      validate: function(_date, value, _options) {
        return value.isTwoDigitYear || value.year > 0;
      },
      set: function(date, flags, value, _options) {
        var currentYear = date.getUTCFullYear();
        if (value.isTwoDigitYear) {
          var normalizedTwoDigitYear = normalizeTwoDigitYear(value.year, currentYear);
          date.setUTCFullYear(normalizedTwoDigitYear, 0, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        }
        var year = !("era" in flags) || flags.era === 1 ? value.year : 1 - value.year;
        date.setUTCFullYear(year, 0, 1);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["Y", "R", "u", "w", "I", "i", "e", "c", "t", "T"]
    },
    Y: {
      priority: 130,
      parse: function(string, token, match3, _options) {
        var valueCallback = function(year) {
          return {
            year,
            isTwoDigitYear: token === "YY"
          };
        };
        switch (token) {
          case "Y":
            return parseNDigits(4, string, valueCallback);
          case "Yo":
            return match3.ordinalNumber(string, {
              unit: "year",
              valueCallback
            });
          default:
            return parseNDigits(token.length, string, valueCallback);
        }
      },
      validate: function(_date, value, _options) {
        return value.isTwoDigitYear || value.year > 0;
      },
      set: function(date, flags, value, options) {
        var currentYear = getUTCWeekYear(date, options);
        if (value.isTwoDigitYear) {
          var normalizedTwoDigitYear = normalizeTwoDigitYear(value.year, currentYear);
          date.setUTCFullYear(normalizedTwoDigitYear, 0, options.firstWeekContainsDate);
          date.setUTCHours(0, 0, 0, 0);
          return startOfUTCWeek(date, options);
        }
        var year = !("era" in flags) || flags.era === 1 ? value.year : 1 - value.year;
        date.setUTCFullYear(year, 0, options.firstWeekContainsDate);
        date.setUTCHours(0, 0, 0, 0);
        return startOfUTCWeek(date, options);
      },
      incompatibleTokens: ["y", "R", "u", "Q", "q", "M", "L", "I", "d", "D", "i", "t", "T"]
    },
    R: {
      priority: 130,
      parse: function(string, token, _match, _options) {
        if (token === "R") {
          return parseNDigitsSigned(4, string);
        }
        return parseNDigitsSigned(token.length, string);
      },
      set: function(_date, _flags, value, _options) {
        var firstWeekOfYear = new Date(0);
        firstWeekOfYear.setUTCFullYear(value, 0, 4);
        firstWeekOfYear.setUTCHours(0, 0, 0, 0);
        return startOfUTCISOWeek(firstWeekOfYear);
      },
      incompatibleTokens: ["G", "y", "Y", "u", "Q", "q", "M", "L", "w", "d", "D", "e", "c", "t", "T"]
    },
    u: {
      priority: 130,
      parse: function(string, token, _match, _options) {
        if (token === "u") {
          return parseNDigitsSigned(4, string);
        }
        return parseNDigitsSigned(token.length, string);
      },
      set: function(date, _flags, value, _options) {
        date.setUTCFullYear(value, 0, 1);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["G", "y", "Y", "R", "w", "I", "i", "e", "c", "t", "T"]
    },
    Q: {
      priority: 120,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "Q":
          case "QQ":
            return parseNDigits(token.length, string);
          case "Qo":
            return match3.ordinalNumber(string, {
              unit: "quarter"
            });
          case "QQQ":
            return match3.quarter(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.quarter(string, {
              width: "narrow",
              context: "formatting"
            });
          case "QQQQQ":
            return match3.quarter(string, {
              width: "narrow",
              context: "formatting"
            });
          case "QQQQ":
          default:
            return match3.quarter(string, {
              width: "wide",
              context: "formatting"
            }) || match3.quarter(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.quarter(string, {
              width: "narrow",
              context: "formatting"
            });
        }
      },
      validate: function(_date, value, _options) {
        return value >= 1 && value <= 4;
      },
      set: function(date, _flags, value, _options) {
        date.setUTCMonth((value - 1) * 3, 1);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["Y", "R", "q", "M", "L", "w", "I", "d", "D", "i", "e", "c", "t", "T"]
    },
    q: {
      priority: 120,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "q":
          case "qq":
            return parseNDigits(token.length, string);
          case "qo":
            return match3.ordinalNumber(string, {
              unit: "quarter"
            });
          case "qqq":
            return match3.quarter(string, {
              width: "abbreviated",
              context: "standalone"
            }) || match3.quarter(string, {
              width: "narrow",
              context: "standalone"
            });
          case "qqqqq":
            return match3.quarter(string, {
              width: "narrow",
              context: "standalone"
            });
          case "qqqq":
          default:
            return match3.quarter(string, {
              width: "wide",
              context: "standalone"
            }) || match3.quarter(string, {
              width: "abbreviated",
              context: "standalone"
            }) || match3.quarter(string, {
              width: "narrow",
              context: "standalone"
            });
        }
      },
      validate: function(_date, value, _options) {
        return value >= 1 && value <= 4;
      },
      set: function(date, _flags, value, _options) {
        date.setUTCMonth((value - 1) * 3, 1);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["Y", "R", "Q", "M", "L", "w", "I", "d", "D", "i", "e", "c", "t", "T"]
    },
    M: {
      priority: 110,
      parse: function(string, token, match3, _options) {
        var valueCallback = function(value) {
          return value - 1;
        };
        switch (token) {
          case "M":
            return parseNumericPattern(numericPatterns.month, string, valueCallback);
          case "MM":
            return parseNDigits(2, string, valueCallback);
          case "Mo":
            return match3.ordinalNumber(string, {
              unit: "month",
              valueCallback
            });
          case "MMM":
            return match3.month(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.month(string, {
              width: "narrow",
              context: "formatting"
            });
          case "MMMMM":
            return match3.month(string, {
              width: "narrow",
              context: "formatting"
            });
          case "MMMM":
          default:
            return match3.month(string, {
              width: "wide",
              context: "formatting"
            }) || match3.month(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.month(string, {
              width: "narrow",
              context: "formatting"
            });
        }
      },
      validate: function(_date, value, _options) {
        return value >= 0 && value <= 11;
      },
      set: function(date, _flags, value, _options) {
        date.setUTCMonth(value, 1);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["Y", "R", "q", "Q", "L", "w", "I", "D", "i", "e", "c", "t", "T"]
    },
    L: {
      priority: 110,
      parse: function(string, token, match3, _options) {
        var valueCallback = function(value) {
          return value - 1;
        };
        switch (token) {
          case "L":
            return parseNumericPattern(numericPatterns.month, string, valueCallback);
          case "LL":
            return parseNDigits(2, string, valueCallback);
          case "Lo":
            return match3.ordinalNumber(string, {
              unit: "month",
              valueCallback
            });
          case "LLL":
            return match3.month(string, {
              width: "abbreviated",
              context: "standalone"
            }) || match3.month(string, {
              width: "narrow",
              context: "standalone"
            });
          case "LLLLL":
            return match3.month(string, {
              width: "narrow",
              context: "standalone"
            });
          case "LLLL":
          default:
            return match3.month(string, {
              width: "wide",
              context: "standalone"
            }) || match3.month(string, {
              width: "abbreviated",
              context: "standalone"
            }) || match3.month(string, {
              width: "narrow",
              context: "standalone"
            });
        }
      },
      validate: function(_date, value, _options) {
        return value >= 0 && value <= 11;
      },
      set: function(date, _flags, value, _options) {
        date.setUTCMonth(value, 1);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["Y", "R", "q", "Q", "M", "w", "I", "D", "i", "e", "c", "t", "T"]
    },
    w: {
      priority: 100,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "w":
            return parseNumericPattern(numericPatterns.week, string);
          case "wo":
            return match3.ordinalNumber(string, {
              unit: "week"
            });
          default:
            return parseNDigits(token.length, string);
        }
      },
      validate: function(_date, value, _options) {
        return value >= 1 && value <= 53;
      },
      set: function(date, _flags, value, options) {
        return startOfUTCWeek(setUTCWeek(date, value, options), options);
      },
      incompatibleTokens: ["y", "R", "u", "q", "Q", "M", "L", "I", "d", "D", "i", "t", "T"]
    },
    I: {
      priority: 100,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "I":
            return parseNumericPattern(numericPatterns.week, string);
          case "Io":
            return match3.ordinalNumber(string, {
              unit: "week"
            });
          default:
            return parseNDigits(token.length, string);
        }
      },
      validate: function(_date, value, _options) {
        return value >= 1 && value <= 53;
      },
      set: function(date, _flags, value, options) {
        return startOfUTCISOWeek(setUTCISOWeek(date, value, options), options);
      },
      incompatibleTokens: ["y", "Y", "u", "q", "Q", "M", "L", "w", "d", "D", "e", "c", "t", "T"]
    },
    d: {
      priority: 90,
      subPriority: 1,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "d":
            return parseNumericPattern(numericPatterns.date, string);
          case "do":
            return match3.ordinalNumber(string, {
              unit: "date"
            });
          default:
            return parseNDigits(token.length, string);
        }
      },
      validate: function(date, value, _options) {
        var year = date.getUTCFullYear();
        var isLeapYear = isLeapYearIndex(year);
        var month = date.getUTCMonth();
        if (isLeapYear) {
          return value >= 1 && value <= DAYS_IN_MONTH_LEAP_YEAR[month];
        } else {
          return value >= 1 && value <= DAYS_IN_MONTH[month];
        }
      },
      set: function(date, _flags, value, _options) {
        date.setUTCDate(value);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["Y", "R", "q", "Q", "w", "I", "D", "i", "e", "c", "t", "T"]
    },
    D: {
      priority: 90,
      subPriority: 1,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "D":
          case "DD":
            return parseNumericPattern(numericPatterns.dayOfYear, string);
          case "Do":
            return match3.ordinalNumber(string, {
              unit: "date"
            });
          default:
            return parseNDigits(token.length, string);
        }
      },
      validate: function(date, value, _options) {
        var year = date.getUTCFullYear();
        var isLeapYear = isLeapYearIndex(year);
        if (isLeapYear) {
          return value >= 1 && value <= 366;
        } else {
          return value >= 1 && value <= 365;
        }
      },
      set: function(date, _flags, value, _options) {
        date.setUTCMonth(0, value);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["Y", "R", "q", "Q", "M", "L", "w", "I", "d", "E", "i", "e", "c", "t", "T"]
    },
    E: {
      priority: 90,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "E":
          case "EE":
          case "EEE":
            return match3.day(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.day(string, {
              width: "short",
              context: "formatting"
            }) || match3.day(string, {
              width: "narrow",
              context: "formatting"
            });
          case "EEEEE":
            return match3.day(string, {
              width: "narrow",
              context: "formatting"
            });
          case "EEEEEE":
            return match3.day(string, {
              width: "short",
              context: "formatting"
            }) || match3.day(string, {
              width: "narrow",
              context: "formatting"
            });
          case "EEEE":
          default:
            return match3.day(string, {
              width: "wide",
              context: "formatting"
            }) || match3.day(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.day(string, {
              width: "short",
              context: "formatting"
            }) || match3.day(string, {
              width: "narrow",
              context: "formatting"
            });
        }
      },
      validate: function(_date, value, _options) {
        return value >= 0 && value <= 6;
      },
      set: function(date, _flags, value, options) {
        date = setUTCDay(date, value, options);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["D", "i", "e", "c", "t", "T"]
    },
    e: {
      priority: 90,
      parse: function(string, token, match3, options) {
        var valueCallback = function(value) {
          var wholeWeekDays = Math.floor((value - 1) / 7) * 7;
          return (value + options.weekStartsOn + 6) % 7 + wholeWeekDays;
        };
        switch (token) {
          case "e":
          case "ee":
            return parseNDigits(token.length, string, valueCallback);
          case "eo":
            return match3.ordinalNumber(string, {
              unit: "day",
              valueCallback
            });
          case "eee":
            return match3.day(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.day(string, {
              width: "short",
              context: "formatting"
            }) || match3.day(string, {
              width: "narrow",
              context: "formatting"
            });
          case "eeeee":
            return match3.day(string, {
              width: "narrow",
              context: "formatting"
            });
          case "eeeeee":
            return match3.day(string, {
              width: "short",
              context: "formatting"
            }) || match3.day(string, {
              width: "narrow",
              context: "formatting"
            });
          case "eeee":
          default:
            return match3.day(string, {
              width: "wide",
              context: "formatting"
            }) || match3.day(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.day(string, {
              width: "short",
              context: "formatting"
            }) || match3.day(string, {
              width: "narrow",
              context: "formatting"
            });
        }
      },
      validate: function(_date, value, _options) {
        return value >= 0 && value <= 6;
      },
      set: function(date, _flags, value, options) {
        date = setUTCDay(date, value, options);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["y", "R", "u", "q", "Q", "M", "L", "I", "d", "D", "E", "i", "c", "t", "T"]
    },
    c: {
      priority: 90,
      parse: function(string, token, match3, options) {
        var valueCallback = function(value) {
          var wholeWeekDays = Math.floor((value - 1) / 7) * 7;
          return (value + options.weekStartsOn + 6) % 7 + wholeWeekDays;
        };
        switch (token) {
          case "c":
          case "cc":
            return parseNDigits(token.length, string, valueCallback);
          case "co":
            return match3.ordinalNumber(string, {
              unit: "day",
              valueCallback
            });
          case "ccc":
            return match3.day(string, {
              width: "abbreviated",
              context: "standalone"
            }) || match3.day(string, {
              width: "short",
              context: "standalone"
            }) || match3.day(string, {
              width: "narrow",
              context: "standalone"
            });
          case "ccccc":
            return match3.day(string, {
              width: "narrow",
              context: "standalone"
            });
          case "cccccc":
            return match3.day(string, {
              width: "short",
              context: "standalone"
            }) || match3.day(string, {
              width: "narrow",
              context: "standalone"
            });
          case "cccc":
          default:
            return match3.day(string, {
              width: "wide",
              context: "standalone"
            }) || match3.day(string, {
              width: "abbreviated",
              context: "standalone"
            }) || match3.day(string, {
              width: "short",
              context: "standalone"
            }) || match3.day(string, {
              width: "narrow",
              context: "standalone"
            });
        }
      },
      validate: function(_date, value, _options) {
        return value >= 0 && value <= 6;
      },
      set: function(date, _flags, value, options) {
        date = setUTCDay(date, value, options);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["y", "R", "u", "q", "Q", "M", "L", "I", "d", "D", "E", "i", "e", "t", "T"]
    },
    i: {
      priority: 90,
      parse: function(string, token, match3, _options) {
        var valueCallback = function(value) {
          if (value === 0) {
            return 7;
          }
          return value;
        };
        switch (token) {
          case "i":
          case "ii":
            return parseNDigits(token.length, string);
          case "io":
            return match3.ordinalNumber(string, {
              unit: "day"
            });
          case "iii":
            return match3.day(string, {
              width: "abbreviated",
              context: "formatting",
              valueCallback
            }) || match3.day(string, {
              width: "short",
              context: "formatting",
              valueCallback
            }) || match3.day(string, {
              width: "narrow",
              context: "formatting",
              valueCallback
            });
          case "iiiii":
            return match3.day(string, {
              width: "narrow",
              context: "formatting",
              valueCallback
            });
          case "iiiiii":
            return match3.day(string, {
              width: "short",
              context: "formatting",
              valueCallback
            }) || match3.day(string, {
              width: "narrow",
              context: "formatting",
              valueCallback
            });
          case "iiii":
          default:
            return match3.day(string, {
              width: "wide",
              context: "formatting",
              valueCallback
            }) || match3.day(string, {
              width: "abbreviated",
              context: "formatting",
              valueCallback
            }) || match3.day(string, {
              width: "short",
              context: "formatting",
              valueCallback
            }) || match3.day(string, {
              width: "narrow",
              context: "formatting",
              valueCallback
            });
        }
      },
      validate: function(_date, value, _options) {
        return value >= 1 && value <= 7;
      },
      set: function(date, _flags, value, options) {
        date = setUTCISODay(date, value, options);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["y", "Y", "u", "q", "Q", "M", "L", "w", "d", "D", "E", "e", "c", "t", "T"]
    },
    a: {
      priority: 80,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "a":
          case "aa":
          case "aaa":
            return match3.dayPeriod(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.dayPeriod(string, {
              width: "narrow",
              context: "formatting"
            });
          case "aaaaa":
            return match3.dayPeriod(string, {
              width: "narrow",
              context: "formatting"
            });
          case "aaaa":
          default:
            return match3.dayPeriod(string, {
              width: "wide",
              context: "formatting"
            }) || match3.dayPeriod(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.dayPeriod(string, {
              width: "narrow",
              context: "formatting"
            });
        }
      },
      set: function(date, _flags, value, _options) {
        date.setUTCHours(dayPeriodEnumToHours(value), 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["b", "B", "H", "k", "t", "T"]
    },
    b: {
      priority: 80,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "b":
          case "bb":
          case "bbb":
            return match3.dayPeriod(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.dayPeriod(string, {
              width: "narrow",
              context: "formatting"
            });
          case "bbbbb":
            return match3.dayPeriod(string, {
              width: "narrow",
              context: "formatting"
            });
          case "bbbb":
          default:
            return match3.dayPeriod(string, {
              width: "wide",
              context: "formatting"
            }) || match3.dayPeriod(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.dayPeriod(string, {
              width: "narrow",
              context: "formatting"
            });
        }
      },
      set: function(date, _flags, value, _options) {
        date.setUTCHours(dayPeriodEnumToHours(value), 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["a", "B", "H", "k", "t", "T"]
    },
    B: {
      priority: 80,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "B":
          case "BB":
          case "BBB":
            return match3.dayPeriod(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.dayPeriod(string, {
              width: "narrow",
              context: "formatting"
            });
          case "BBBBB":
            return match3.dayPeriod(string, {
              width: "narrow",
              context: "formatting"
            });
          case "BBBB":
          default:
            return match3.dayPeriod(string, {
              width: "wide",
              context: "formatting"
            }) || match3.dayPeriod(string, {
              width: "abbreviated",
              context: "formatting"
            }) || match3.dayPeriod(string, {
              width: "narrow",
              context: "formatting"
            });
        }
      },
      set: function(date, _flags, value, _options) {
        date.setUTCHours(dayPeriodEnumToHours(value), 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["a", "b", "t", "T"]
    },
    h: {
      priority: 70,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "h":
            return parseNumericPattern(numericPatterns.hour12h, string);
          case "ho":
            return match3.ordinalNumber(string, {
              unit: "hour"
            });
          default:
            return parseNDigits(token.length, string);
        }
      },
      validate: function(_date, value, _options) {
        return value >= 1 && value <= 12;
      },
      set: function(date, _flags, value, _options) {
        var isPM = date.getUTCHours() >= 12;
        if (isPM && value < 12) {
          date.setUTCHours(value + 12, 0, 0, 0);
        } else if (!isPM && value === 12) {
          date.setUTCHours(0, 0, 0, 0);
        } else {
          date.setUTCHours(value, 0, 0, 0);
        }
        return date;
      },
      incompatibleTokens: ["H", "K", "k", "t", "T"]
    },
    H: {
      priority: 70,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "H":
            return parseNumericPattern(numericPatterns.hour23h, string);
          case "Ho":
            return match3.ordinalNumber(string, {
              unit: "hour"
            });
          default:
            return parseNDigits(token.length, string);
        }
      },
      validate: function(_date, value, _options) {
        return value >= 0 && value <= 23;
      },
      set: function(date, _flags, value, _options) {
        date.setUTCHours(value, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["a", "b", "h", "K", "k", "t", "T"]
    },
    K: {
      priority: 70,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "K":
            return parseNumericPattern(numericPatterns.hour11h, string);
          case "Ko":
            return match3.ordinalNumber(string, {
              unit: "hour"
            });
          default:
            return parseNDigits(token.length, string);
        }
      },
      validate: function(_date, value, _options) {
        return value >= 0 && value <= 11;
      },
      set: function(date, _flags, value, _options) {
        var isPM = date.getUTCHours() >= 12;
        if (isPM && value < 12) {
          date.setUTCHours(value + 12, 0, 0, 0);
        } else {
          date.setUTCHours(value, 0, 0, 0);
        }
        return date;
      },
      incompatibleTokens: ["h", "H", "k", "t", "T"]
    },
    k: {
      priority: 70,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "k":
            return parseNumericPattern(numericPatterns.hour24h, string);
          case "ko":
            return match3.ordinalNumber(string, {
              unit: "hour"
            });
          default:
            return parseNDigits(token.length, string);
        }
      },
      validate: function(_date, value, _options) {
        return value >= 1 && value <= 24;
      },
      set: function(date, _flags, value, _options) {
        var hours = value <= 24 ? value % 24 : value;
        date.setUTCHours(hours, 0, 0, 0);
        return date;
      },
      incompatibleTokens: ["a", "b", "h", "H", "K", "t", "T"]
    },
    m: {
      priority: 60,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "m":
            return parseNumericPattern(numericPatterns.minute, string);
          case "mo":
            return match3.ordinalNumber(string, {
              unit: "minute"
            });
          default:
            return parseNDigits(token.length, string);
        }
      },
      validate: function(_date, value, _options) {
        return value >= 0 && value <= 59;
      },
      set: function(date, _flags, value, _options) {
        date.setUTCMinutes(value, 0, 0);
        return date;
      },
      incompatibleTokens: ["t", "T"]
    },
    s: {
      priority: 50,
      parse: function(string, token, match3, _options) {
        switch (token) {
          case "s":
            return parseNumericPattern(numericPatterns.second, string);
          case "so":
            return match3.ordinalNumber(string, {
              unit: "second"
            });
          default:
            return parseNDigits(token.length, string);
        }
      },
      validate: function(_date, value, _options) {
        return value >= 0 && value <= 59;
      },
      set: function(date, _flags, value, _options) {
        date.setUTCSeconds(value, 0);
        return date;
      },
      incompatibleTokens: ["t", "T"]
    },
    S: {
      priority: 30,
      parse: function(string, token, _match, _options) {
        var valueCallback = function(value) {
          return Math.floor(value * Math.pow(10, -token.length + 3));
        };
        return parseNDigits(token.length, string, valueCallback);
      },
      set: function(date, _flags, value, _options) {
        date.setUTCMilliseconds(value);
        return date;
      },
      incompatibleTokens: ["t", "T"]
    },
    X: {
      priority: 10,
      parse: function(string, token, _match, _options) {
        switch (token) {
          case "X":
            return parseTimezonePattern(timezonePatterns.basicOptionalMinutes, string);
          case "XX":
            return parseTimezonePattern(timezonePatterns.basic, string);
          case "XXXX":
            return parseTimezonePattern(timezonePatterns.basicOptionalSeconds, string);
          case "XXXXX":
            return parseTimezonePattern(timezonePatterns.extendedOptionalSeconds, string);
          case "XXX":
          default:
            return parseTimezonePattern(timezonePatterns.extended, string);
        }
      },
      set: function(date, flags, value, _options) {
        if (flags.timestampIsSet) {
          return date;
        }
        return new Date(date.getTime() - value);
      },
      incompatibleTokens: ["t", "T", "x"]
    },
    x: {
      priority: 10,
      parse: function(string, token, _match, _options) {
        switch (token) {
          case "x":
            return parseTimezonePattern(timezonePatterns.basicOptionalMinutes, string);
          case "xx":
            return parseTimezonePattern(timezonePatterns.basic, string);
          case "xxxx":
            return parseTimezonePattern(timezonePatterns.basicOptionalSeconds, string);
          case "xxxxx":
            return parseTimezonePattern(timezonePatterns.extendedOptionalSeconds, string);
          case "xxx":
          default:
            return parseTimezonePattern(timezonePatterns.extended, string);
        }
      },
      set: function(date, flags, value, _options) {
        if (flags.timestampIsSet) {
          return date;
        }
        return new Date(date.getTime() - value);
      },
      incompatibleTokens: ["t", "T", "X"]
    },
    t: {
      priority: 40,
      parse: function(string, _token, _match, _options) {
        return parseAnyDigitsSigned(string);
      },
      set: function(_date, _flags, value, _options) {
        return [new Date(value * 1e3), {
          timestampIsSet: true
        }];
      },
      incompatibleTokens: "*"
    },
    T: {
      priority: 20,
      parse: function(string, _token, _match, _options) {
        return parseAnyDigitsSigned(string);
      },
      set: function(_date, _flags, value, _options) {
        return [new Date(value), {
          timestampIsSet: true
        }];
      },
      incompatibleTokens: "*"
    }
  };
  var parsers_default = parsers;

  // node_modules/date-fns/esm/parse/index.js
  var TIMEZONE_UNIT_PRIORITY = 10;
  var formattingTokensRegExp2 = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g;
  var longFormattingTokensRegExp2 = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
  var escapedStringRegExp2 = /^'([^]*?)'?$/;
  var doubleQuoteRegExp2 = /''/g;
  var notWhitespaceRegExp = /\S/;
  var unescapedLatinCharacterRegExp2 = /[a-zA-Z]/;
  function parse2(dirtyDateString, dirtyFormatString, dirtyReferenceDate, dirtyOptions) {
    requiredArgs(3, arguments);
    var dateString = String(dirtyDateString);
    var formatString = String(dirtyFormatString);
    var options = dirtyOptions || {};
    var locale3 = options.locale || en_US_default;
    if (!locale3.match) {
      throw new RangeError("locale must contain match property");
    }
    var localeFirstWeekContainsDate = locale3.options && locale3.options.firstWeekContainsDate;
    var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
    var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate);
    if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
      throw new RangeError("firstWeekContainsDate must be between 1 and 7 inclusively");
    }
    var localeWeekStartsOn = locale3.options && locale3.options.weekStartsOn;
    var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
    var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn);
    if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
      throw new RangeError("weekStartsOn must be between 0 and 6 inclusively");
    }
    if (formatString === "") {
      if (dateString === "") {
        return toDate(dirtyReferenceDate);
      } else {
        return new Date(NaN);
      }
    }
    var subFnOptions = {
      firstWeekContainsDate,
      weekStartsOn,
      locale: locale3
    };
    var setters = [{
      priority: TIMEZONE_UNIT_PRIORITY,
      subPriority: -1,
      set: dateToSystemTimezone,
      index: 0
    }];
    var i4;
    var tokens = formatString.match(longFormattingTokensRegExp2).map(function(substring) {
      var firstCharacter2 = substring[0];
      if (firstCharacter2 === "p" || firstCharacter2 === "P") {
        var longFormatter = longFormatters_default[firstCharacter2];
        return longFormatter(substring, locale3.formatLong, subFnOptions);
      }
      return substring;
    }).join("").match(formattingTokensRegExp2);
    var usedTokens = [];
    for (i4 = 0; i4 < tokens.length; i4++) {
      var token = tokens[i4];
      if (!options.useAdditionalWeekYearTokens && isProtectedWeekYearToken(token)) {
        throwProtectedError(token, formatString, dirtyDateString);
      }
      if (!options.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(token)) {
        throwProtectedError(token, formatString, dirtyDateString);
      }
      var firstCharacter = token[0];
      var parser = parsers_default[firstCharacter];
      if (parser) {
        var incompatibleTokens = parser.incompatibleTokens;
        if (Array.isArray(incompatibleTokens)) {
          var incompatibleToken = void 0;
          for (var _i = 0; _i < usedTokens.length; _i++) {
            var usedToken = usedTokens[_i].token;
            if (incompatibleTokens.indexOf(usedToken) !== -1 || usedToken === firstCharacter) {
              incompatibleToken = usedTokens[_i];
              break;
            }
          }
          if (incompatibleToken) {
            throw new RangeError("The format string mustn't contain `".concat(incompatibleToken.fullToken, "` and `").concat(token, "` at the same time"));
          }
        } else if (parser.incompatibleTokens === "*" && usedTokens.length) {
          throw new RangeError("The format string mustn't contain `".concat(token, "` and any other token at the same time"));
        }
        usedTokens.push({
          token: firstCharacter,
          fullToken: token
        });
        var parseResult = parser.parse(dateString, token, locale3.match, subFnOptions);
        if (!parseResult) {
          return new Date(NaN);
        }
        setters.push({
          priority: parser.priority,
          subPriority: parser.subPriority || 0,
          set: parser.set,
          validate: parser.validate,
          value: parseResult.value,
          index: setters.length
        });
        dateString = parseResult.rest;
      } else {
        if (firstCharacter.match(unescapedLatinCharacterRegExp2)) {
          throw new RangeError("Format string contains an unescaped latin alphabet character `" + firstCharacter + "`");
        }
        if (token === "''") {
          token = "'";
        } else if (firstCharacter === "'") {
          token = cleanEscapedString2(token);
        }
        if (dateString.indexOf(token) === 0) {
          dateString = dateString.slice(token.length);
        } else {
          return new Date(NaN);
        }
      }
    }
    if (dateString.length > 0 && notWhitespaceRegExp.test(dateString)) {
      return new Date(NaN);
    }
    var uniquePrioritySetters = setters.map(function(setter2) {
      return setter2.priority;
    }).sort(function(a3, b2) {
      return b2 - a3;
    }).filter(function(priority, index, array) {
      return array.indexOf(priority) === index;
    }).map(function(priority) {
      return setters.filter(function(setter2) {
        return setter2.priority === priority;
      }).sort(function(a3, b2) {
        return b2.subPriority - a3.subPriority;
      });
    }).map(function(setterArray) {
      return setterArray[0];
    });
    var date = toDate(dirtyReferenceDate);
    if (isNaN(date)) {
      return new Date(NaN);
    }
    var utcDate = subMilliseconds(date, getTimezoneOffsetInMilliseconds(date));
    var flags = {};
    for (i4 = 0; i4 < uniquePrioritySetters.length; i4++) {
      var setter = uniquePrioritySetters[i4];
      if (setter.validate && !setter.validate(utcDate, setter.value, subFnOptions)) {
        return new Date(NaN);
      }
      var result = setter.set(utcDate, flags, setter.value, subFnOptions);
      if (result[0]) {
        utcDate = result[0];
        assign(flags, result[1]);
      } else {
        utcDate = result;
      }
    }
    return utcDate;
  }
  function dateToSystemTimezone(date, flags) {
    if (flags.timestampIsSet) {
      return date;
    }
    var convertedDate = new Date(0);
    convertedDate.setFullYear(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    convertedDate.setHours(date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
    return convertedDate;
  }
  function cleanEscapedString2(input) {
    return input.match(escapedStringRegExp2)[1].replace(doubleQuoteRegExp2, "'");
  }

  // node_modules/date-fns/esm/startOfHour/index.js
  function startOfHour(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    date.setMinutes(0, 0, 0);
    return date;
  }

  // node_modules/date-fns/esm/startOfSecond/index.js
  function startOfSecond(dirtyDate) {
    requiredArgs(1, arguments);
    var date = toDate(dirtyDate);
    date.setMilliseconds(0);
    return date;
  }

  // node_modules/date-fns/esm/parseISO/index.js
  function parseISO(argument, dirtyOptions) {
    requiredArgs(1, arguments);
    var options = dirtyOptions || {};
    var additionalDigits = options.additionalDigits == null ? 2 : toInteger(options.additionalDigits);
    if (additionalDigits !== 2 && additionalDigits !== 1 && additionalDigits !== 0) {
      throw new RangeError("additionalDigits must be 0, 1 or 2");
    }
    if (!(typeof argument === "string" || Object.prototype.toString.call(argument) === "[object String]")) {
      return new Date(NaN);
    }
    var dateStrings = splitDateString(argument);
    var date;
    if (dateStrings.date) {
      var parseYearResult = parseYear(dateStrings.date, additionalDigits);
      date = parseDate(parseYearResult.restDateString, parseYearResult.year);
    }
    if (!date || isNaN(date.getTime())) {
      return new Date(NaN);
    }
    var timestamp = date.getTime();
    var time = 0;
    var offset;
    if (dateStrings.time) {
      time = parseTime(dateStrings.time);
      if (isNaN(time)) {
        return new Date(NaN);
      }
    }
    if (dateStrings.timezone) {
      offset = parseTimezone(dateStrings.timezone);
      if (isNaN(offset)) {
        return new Date(NaN);
      }
    } else {
      var dirtyDate = new Date(timestamp + time);
      var result = new Date(0);
      result.setFullYear(dirtyDate.getUTCFullYear(), dirtyDate.getUTCMonth(), dirtyDate.getUTCDate());
      result.setHours(dirtyDate.getUTCHours(), dirtyDate.getUTCMinutes(), dirtyDate.getUTCSeconds(), dirtyDate.getUTCMilliseconds());
      return result;
    }
    return new Date(timestamp + time + offset);
  }
  var patterns = {
    dateTimeDelimiter: /[T ]/,
    timeZoneDelimiter: /[Z ]/i,
    timezone: /([Z+-].*)$/
  };
  var dateRegex = /^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/;
  var timeRegex = /^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/;
  var timezoneRegex = /^([+-])(\d{2})(?::?(\d{2}))?$/;
  function splitDateString(dateString) {
    var dateStrings = {};
    var array = dateString.split(patterns.dateTimeDelimiter);
    var timeString;
    if (array.length > 2) {
      return dateStrings;
    }
    if (/:/.test(array[0])) {
      timeString = array[0];
    } else {
      dateStrings.date = array[0];
      timeString = array[1];
      if (patterns.timeZoneDelimiter.test(dateStrings.date)) {
        dateStrings.date = dateString.split(patterns.timeZoneDelimiter)[0];
        timeString = dateString.substr(dateStrings.date.length, dateString.length);
      }
    }
    if (timeString) {
      var token = patterns.timezone.exec(timeString);
      if (token) {
        dateStrings.time = timeString.replace(token[1], "");
        dateStrings.timezone = token[1];
      } else {
        dateStrings.time = timeString;
      }
    }
    return dateStrings;
  }
  function parseYear(dateString, additionalDigits) {
    var regex = new RegExp("^(?:(\\d{4}|[+-]\\d{" + (4 + additionalDigits) + "})|(\\d{2}|[+-]\\d{" + (2 + additionalDigits) + "})$)");
    var captures = dateString.match(regex);
    if (!captures)
      return {
        year: NaN,
        restDateString: ""
      };
    var year = captures[1] ? parseInt(captures[1]) : null;
    var century = captures[2] ? parseInt(captures[2]) : null;
    return {
      year: century === null ? year : century * 100,
      restDateString: dateString.slice((captures[1] || captures[2]).length)
    };
  }
  function parseDate(dateString, year) {
    if (year === null)
      return new Date(NaN);
    var captures = dateString.match(dateRegex);
    if (!captures)
      return new Date(NaN);
    var isWeekDate = !!captures[4];
    var dayOfYear = parseDateUnit(captures[1]);
    var month = parseDateUnit(captures[2]) - 1;
    var day = parseDateUnit(captures[3]);
    var week = parseDateUnit(captures[4]);
    var dayOfWeek = parseDateUnit(captures[5]) - 1;
    if (isWeekDate) {
      if (!validateWeekDate(year, week, dayOfWeek)) {
        return new Date(NaN);
      }
      return dayOfISOWeekYear(year, week, dayOfWeek);
    } else {
      var date = new Date(0);
      if (!validateDate(year, month, day) || !validateDayOfYearDate(year, dayOfYear)) {
        return new Date(NaN);
      }
      date.setUTCFullYear(year, month, Math.max(dayOfYear, day));
      return date;
    }
  }
  function parseDateUnit(value) {
    return value ? parseInt(value) : 1;
  }
  function parseTime(timeString) {
    var captures = timeString.match(timeRegex);
    if (!captures)
      return NaN;
    var hours = parseTimeUnit(captures[1]);
    var minutes = parseTimeUnit(captures[2]);
    var seconds = parseTimeUnit(captures[3]);
    if (!validateTime(hours, minutes, seconds)) {
      return NaN;
    }
    return hours * millisecondsInHour + minutes * millisecondsInMinute + seconds * 1e3;
  }
  function parseTimeUnit(value) {
    return value && parseFloat(value.replace(",", ".")) || 0;
  }
  function parseTimezone(timezoneString) {
    if (timezoneString === "Z")
      return 0;
    var captures = timezoneString.match(timezoneRegex);
    if (!captures)
      return 0;
    var sign2 = captures[1] === "+" ? -1 : 1;
    var hours = parseInt(captures[2]);
    var minutes = captures[3] && parseInt(captures[3]) || 0;
    if (!validateTimezone(hours, minutes)) {
      return NaN;
    }
    return sign2 * (hours * millisecondsInHour + minutes * millisecondsInMinute);
  }
  function dayOfISOWeekYear(isoWeekYear, week, day) {
    var date = new Date(0);
    date.setUTCFullYear(isoWeekYear, 0, 4);
    var fourthOfJanuaryDay = date.getUTCDay() || 7;
    var diff = (week - 1) * 7 + day + 1 - fourthOfJanuaryDay;
    date.setUTCDate(date.getUTCDate() + diff);
    return date;
  }
  var daysInMonths = [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function isLeapYearIndex2(year) {
    return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
  }
  function validateDate(year, month, date) {
    return month >= 0 && month <= 11 && date >= 1 && date <= (daysInMonths[month] || (isLeapYearIndex2(year) ? 29 : 28));
  }
  function validateDayOfYearDate(year, dayOfYear) {
    return dayOfYear >= 1 && dayOfYear <= (isLeapYearIndex2(year) ? 366 : 365);
  }
  function validateWeekDate(_year, week, day) {
    return week >= 1 && week <= 53 && day >= 0 && day <= 6;
  }
  function validateTime(hours, minutes, seconds) {
    if (hours === 24) {
      return minutes === 0 && seconds === 0;
    }
    return seconds >= 0 && seconds < 60 && minutes >= 0 && minutes < 60 && hours >= 0 && hours < 25;
  }
  function validateTimezone(_hours, minutes) {
    return minutes >= 0 && minutes <= 59;
  }

  // node_modules/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.esm.js
  var FORMATS = {
    datetime: "MMM d, yyyy, h:mm:ss aaaa",
    millisecond: "h:mm:ss.SSS aaaa",
    second: "h:mm:ss aaaa",
    minute: "h:mm aaaa",
    hour: "ha",
    day: "MMM d",
    week: "PP",
    month: "MMM yyyy",
    quarter: "qqq - yyyy",
    year: "yyyy"
  };
  adapters._date.override({
    _id: "date-fns",
    formats: function() {
      return FORMATS;
    },
    parse: function(value, fmt) {
      if (value === null || typeof value === "undefined") {
        return null;
      }
      const type = typeof value;
      if (type === "number" || value instanceof Date) {
        value = toDate(value);
      } else if (type === "string") {
        if (typeof fmt === "string") {
          value = parse2(value, fmt, new Date(), this.options);
        } else {
          value = parseISO(value, this.options);
        }
      }
      return isValid(value) ? value.getTime() : null;
    },
    format: function(time, fmt) {
      return format(time, fmt, this.options);
    },
    add: function(time, amount, unit) {
      switch (unit) {
        case "millisecond":
          return addMilliseconds(time, amount);
        case "second":
          return addSeconds(time, amount);
        case "minute":
          return addMinutes(time, amount);
        case "hour":
          return addHours(time, amount);
        case "day":
          return addDays(time, amount);
        case "week":
          return addWeeks(time, amount);
        case "month":
          return addMonths(time, amount);
        case "quarter":
          return addQuarters(time, amount);
        case "year":
          return addYears(time, amount);
        default:
          return time;
      }
    },
    diff: function(max, min, unit) {
      switch (unit) {
        case "millisecond":
          return differenceInMilliseconds(max, min);
        case "second":
          return differenceInSeconds(max, min);
        case "minute":
          return differenceInMinutes(max, min);
        case "hour":
          return differenceInHours(max, min);
        case "day":
          return differenceInDays(max, min);
        case "week":
          return differenceInWeeks(max, min);
        case "month":
          return differenceInMonths(max, min);
        case "quarter":
          return differenceInQuarters(max, min);
        case "year":
          return differenceInYears(max, min);
        default:
          return 0;
      }
    },
    startOf: function(time, unit, weekday) {
      switch (unit) {
        case "second":
          return startOfSecond(time);
        case "minute":
          return startOfMinute(time);
        case "hour":
          return startOfHour(time);
        case "day":
          return startOfDay(time);
        case "week":
          return startOfWeek(time);
        case "isoWeek":
          return startOfWeek(time, { weekStartsOn: +weekday });
        case "month":
          return startOfMonth(time);
        case "quarter":
          return startOfQuarter(time);
        case "year":
          return startOfYear(time);
        default:
          return time;
      }
    },
    endOf: function(time, unit) {
      switch (unit) {
        case "second":
          return endOfSecond(time);
        case "minute":
          return endOfMinute(time);
        case "hour":
          return endOfHour(time);
        case "day":
          return endOfDay(time);
        case "week":
          return endOfWeek(time);
        case "month":
          return endOfMonth(time);
        case "quarter":
          return endOfQuarter(time);
        case "year":
          return endOfYear(time);
        default:
          return time;
      }
    }
  });

  // node_modules/date-fns/esm/locale/cs/_lib/formatDistance/index.js
  var formatDistanceLocale2 = {
    lessThanXSeconds: {
      one: {
        regular: "méně než sekunda",
        past: "před méně než sekundou",
        future: "za méně než sekundu"
      },
      few: {
        regular: "méně než {{count}} sekundy",
        past: "před méně než {{count}} sekundami",
        future: "za méně než {{count}} sekundy"
      },
      many: {
        regular: "méně než {{count}} sekund",
        past: "před méně než {{count}} sekundami",
        future: "za méně než {{count}} sekund"
      }
    },
    xSeconds: {
      one: {
        regular: "sekunda",
        past: "před sekundou",
        future: "za sekundu"
      },
      few: {
        regular: "{{count}} sekundy",
        past: "před {{count}} sekundami",
        future: "za {{count}} sekundy"
      },
      many: {
        regular: "{{count}} sekund",
        past: "před {{count}} sekundami",
        future: "za {{count}} sekund"
      }
    },
    halfAMinute: {
      other: {
        regular: "půl minuty",
        past: "před půl minutou",
        future: "za půl minuty"
      }
    },
    lessThanXMinutes: {
      one: {
        regular: "méně než minuta",
        past: "před méně než minutou",
        future: "za méně než minutu"
      },
      few: {
        regular: "méně než {{count}} minuty",
        past: "před méně než {{count}} minutami",
        future: "za méně než {{count}} minuty"
      },
      many: {
        regular: "méně než {{count}} minut",
        past: "před méně než {{count}} minutami",
        future: "za méně než {{count}} minut"
      }
    },
    xMinutes: {
      one: {
        regular: "minuta",
        past: "před minutou",
        future: "za minutu"
      },
      few: {
        regular: "{{count}} minuty",
        past: "před {{count}} minutami",
        future: "za {{count}} minuty"
      },
      many: {
        regular: "{{count}} minut",
        past: "před {{count}} minutami",
        future: "za {{count}} minut"
      }
    },
    aboutXHours: {
      one: {
        regular: "přibližně hodina",
        past: "přibližně před hodinou",
        future: "přibližně za hodinu"
      },
      few: {
        regular: "přibližně {{count}} hodiny",
        past: "přibližně před {{count}} hodinami",
        future: "přibližně za {{count}} hodiny"
      },
      many: {
        regular: "přibližně {{count}} hodin",
        past: "přibližně před {{count}} hodinami",
        future: "přibližně za {{count}} hodin"
      }
    },
    xHours: {
      one: {
        regular: "hodina",
        past: "před hodinou",
        future: "za hodinu"
      },
      few: {
        regular: "{{count}} hodiny",
        past: "před {{count}} hodinami",
        future: "za {{count}} hodiny"
      },
      many: {
        regular: "{{count}} hodin",
        past: "před {{count}} hodinami",
        future: "za {{count}} hodin"
      }
    },
    xDays: {
      one: {
        regular: "den",
        past: "před dnem",
        future: "za den"
      },
      few: {
        regular: "{{count}} dny",
        past: "před {{count}} dny",
        future: "za {{count}} dny"
      },
      many: {
        regular: "{{count}} dní",
        past: "před {{count}} dny",
        future: "za {{count}} dní"
      }
    },
    aboutXWeeks: {
      one: {
        regular: "přibližně týden",
        past: "přibližně před týdnem",
        future: "přibližně za týden"
      },
      few: {
        regular: "přibližně {{count}} týdny",
        past: "přibližně před {{count}} týdny",
        future: "přibližně za {{count}} týdny"
      },
      many: {
        regular: "přibližně {{count}} týdnů",
        past: "přibližně před {{count}} týdny",
        future: "přibližně za {{count}} týdnů"
      }
    },
    xWeeks: {
      one: {
        regular: "týden",
        past: "před týdnem",
        future: "za týden"
      },
      few: {
        regular: "{{count}} týdny",
        past: "před {{count}} týdny",
        future: "za {{count}} týdny"
      },
      many: {
        regular: "{{count}} týdnů",
        past: "před {{count}} týdny",
        future: "za {{count}} týdnů"
      }
    },
    aboutXMonths: {
      one: {
        regular: "přibližně měsíc",
        past: "přibližně před měsícem",
        future: "přibližně za měsíc"
      },
      few: {
        regular: "přibližně {{count}} měsíce",
        past: "přibližně před {{count}} měsíci",
        future: "přibližně za {{count}} měsíce"
      },
      many: {
        regular: "přibližně {{count}} měsíců",
        past: "přibližně před {{count}} měsíci",
        future: "přibližně za {{count}} měsíců"
      }
    },
    xMonths: {
      one: {
        regular: "měsíc",
        past: "před měsícem",
        future: "za měsíc"
      },
      few: {
        regular: "{{count}} měsíce",
        past: "před {{count}} měsíci",
        future: "za {{count}} měsíce"
      },
      many: {
        regular: "{{count}} měsíců",
        past: "před {{count}} měsíci",
        future: "za {{count}} měsíců"
      }
    },
    aboutXYears: {
      one: {
        regular: "přibližně rok",
        past: "přibližně před rokem",
        future: "přibližně za rok"
      },
      few: {
        regular: "přibližně {{count}} roky",
        past: "přibližně před {{count}} roky",
        future: "přibližně za {{count}} roky"
      },
      many: {
        regular: "přibližně {{count}} roků",
        past: "přibližně před {{count}} roky",
        future: "přibližně za {{count}} roků"
      }
    },
    xYears: {
      one: {
        regular: "rok",
        past: "před rokem",
        future: "za rok"
      },
      few: {
        regular: "{{count}} roky",
        past: "před {{count}} roky",
        future: "za {{count}} roky"
      },
      many: {
        regular: "{{count}} roků",
        past: "před {{count}} roky",
        future: "za {{count}} roků"
      }
    },
    overXYears: {
      one: {
        regular: "více než rok",
        past: "před více než rokem",
        future: "za více než rok"
      },
      few: {
        regular: "více než {{count}} roky",
        past: "před více než {{count}} roky",
        future: "za více než {{count}} roky"
      },
      many: {
        regular: "více než {{count}} roků",
        past: "před více než {{count}} roky",
        future: "za více než {{count}} roků"
      }
    },
    almostXYears: {
      one: {
        regular: "skoro rok",
        past: "skoro před rokem",
        future: "skoro za rok"
      },
      few: {
        regular: "skoro {{count}} roky",
        past: "skoro před {{count}} roky",
        future: "skoro za {{count}} roky"
      },
      many: {
        regular: "skoro {{count}} roků",
        past: "skoro před {{count}} roky",
        future: "skoro za {{count}} roků"
      }
    }
  };
  function formatDistance2(token, count, options) {
    options = options || {};
    var scheme = formatDistanceLocale2[token];
    var pluralToken;
    if (typeof scheme.other === "object") {
      pluralToken = "other";
    } else if (count === 1) {
      pluralToken = "one";
    } else if (count > 1 && count < 5) {
      pluralToken = "few";
    } else {
      pluralToken = "many";
    }
    var suffixExist = options.addSuffix === true;
    var comparison = options.comparison;
    var timeToken;
    if (suffixExist && comparison === -1) {
      timeToken = "past";
    } else if (suffixExist && comparison === 1) {
      timeToken = "future";
    } else {
      timeToken = "regular";
    }
    return scheme[pluralToken][timeToken].replace("{{count}}", count);
  }

  // node_modules/date-fns/esm/locale/cs/_lib/formatLong/index.js
  var dateFormats2 = {
    full: "EEEE, d. MMMM yyyy",
    long: "d. MMMM yyyy",
    medium: "d. M. yyyy",
    short: "dd.MM.yyyy"
  };
  var timeFormats2 = {
    full: "H:mm:ss zzzz",
    long: "H:mm:ss z",
    medium: "H:mm:ss",
    short: "H:mm"
  };
  var dateTimeFormats2 = {
    full: "{{date}} 'v' {{time}}",
    long: "{{date}} 'v' {{time}}",
    medium: "{{date}}, {{time}}",
    short: "{{date}}, {{time}}"
  };
  var formatLong2 = {
    date: buildFormatLongFn({
      formats: dateFormats2,
      defaultWidth: "full"
    }),
    time: buildFormatLongFn({
      formats: timeFormats2,
      defaultWidth: "full"
    }),
    dateTime: buildFormatLongFn({
      formats: dateTimeFormats2,
      defaultWidth: "full"
    })
  };
  var formatLong_default2 = formatLong2;

  // node_modules/date-fns/esm/locale/cs/_lib/formatRelative/index.js
  var accusativeWeekdays = ["neděli", "pondělí", "úterý", "středu", "čtvrtek", "pátek", "sobotu"];
  var formatRelativeLocale2 = {
    lastWeek: "'poslední' eeee 've' p",
    yesterday: "'včera v' p",
    today: "'dnes v' p",
    tomorrow: "'zítra v' p",
    nextWeek: function(date, _baseDate, _options) {
      var day = date.getUTCDay();
      return "'v " + accusativeWeekdays[day] + " o' p";
    },
    other: "P"
  };
  function formatRelative2(token, date, baseDate, options) {
    var format2 = formatRelativeLocale2[token];
    if (typeof format2 === "function") {
      return format2(date, baseDate, options);
    }
    return format2;
  }

  // node_modules/date-fns/esm/locale/cs/_lib/localize/index.js
  var eraValues2 = {
    narrow: ["př. n. l.", "n. l."],
    abbreviated: ["př. n. l.", "n. l."],
    wide: ["před naším letopočtem", "našeho letopočtu"]
  };
  var quarterValues2 = {
    narrow: ["1", "2", "3", "4"],
    abbreviated: ["1. čtvrtletí", "2. čtvrtletí", "3. čtvrtletí", "4. čtvrtletí"],
    wide: ["1. čtvrtletí", "2. čtvrtletí", "3. čtvrtletí", "4. čtvrtletí"]
  };
  var monthValues2 = {
    narrow: ["L", "Ú", "B", "D", "K", "Č", "Č", "S", "Z", "Ř", "L", "P"],
    abbreviated: ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"],
    wide: ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"]
  };
  var formattingMonthValues = {
    narrow: ["L", "Ú", "B", "D", "K", "Č", "Č", "S", "Z", "Ř", "L", "P"],
    abbreviated: ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"],
    wide: ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"]
  };
  var dayValues2 = {
    narrow: ["ne", "po", "út", "st", "čt", "pá", "so"],
    short: ["ne", "po", "út", "st", "čt", "pá", "so"],
    abbreviated: ["ned", "pon", "úte", "stř", "čtv", "pát", "sob"],
    wide: ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"]
  };
  var dayPeriodValues2 = {
    narrow: {
      am: "dop.",
      pm: "odp.",
      midnight: "půlnoc",
      noon: "poledne",
      morning: "ráno",
      afternoon: "odpoledne",
      evening: "večer",
      night: "noc"
    },
    abbreviated: {
      am: "dop.",
      pm: "odp.",
      midnight: "půlnoc",
      noon: "poledne",
      morning: "ráno",
      afternoon: "odpoledne",
      evening: "večer",
      night: "noc"
    },
    wide: {
      am: "dopoledne",
      pm: "odpoledne",
      midnight: "půlnoc",
      noon: "poledne",
      morning: "ráno",
      afternoon: "odpoledne",
      evening: "večer",
      night: "noc"
    }
  };
  var formattingDayPeriodValues2 = {
    narrow: {
      am: "dop.",
      pm: "odp.",
      midnight: "půlnoc",
      noon: "poledne",
      morning: "ráno",
      afternoon: "odpoledne",
      evening: "večer",
      night: "noc"
    },
    abbreviated: {
      am: "dop.",
      pm: "odp.",
      midnight: "půlnoc",
      noon: "poledne",
      morning: "ráno",
      afternoon: "odpoledne",
      evening: "večer",
      night: "noc"
    },
    wide: {
      am: "dopoledne",
      pm: "odpoledne",
      midnight: "půlnoc",
      noon: "poledne",
      morning: "ráno",
      afternoon: "odpoledne",
      evening: "večer",
      night: "noc"
    }
  };
  function ordinalNumber2(dirtyNumber) {
    var number = Number(dirtyNumber);
    return number + ".";
  }
  var localize2 = {
    ordinalNumber: ordinalNumber2,
    era: buildLocalizeFn({
      values: eraValues2,
      defaultWidth: "wide"
    }),
    quarter: buildLocalizeFn({
      values: quarterValues2,
      defaultWidth: "wide",
      argumentCallback: function(quarter) {
        return Number(quarter) - 1;
      }
    }),
    month: buildLocalizeFn({
      values: monthValues2,
      defaultWidth: "wide",
      formattingValues: formattingMonthValues,
      defaultFormattingWidth: "wide"
    }),
    day: buildLocalizeFn({
      values: dayValues2,
      defaultWidth: "wide"
    }),
    dayPeriod: buildLocalizeFn({
      values: dayPeriodValues2,
      defaultWidth: "wide",
      formattingValues: formattingDayPeriodValues2,
      defaultFormattingWidth: "wide"
    })
  };
  var localize_default2 = localize2;

  // node_modules/date-fns/esm/locale/cs/_lib/match/index.js
  var matchOrdinalNumberPattern2 = /^(\d+)\.?/i;
  var parseOrdinalNumberPattern2 = /\d+/i;
  var matchEraPatterns2 = {
    narrow: /^(p[řr]ed Kr\.|pred n\. l\.|po Kr\.|n\. l\.)/i,
    abbreviated: /^(pe[řr]ed Kr\.|pe[řr]ed n\. l\.|po Kr\.|n\. l\.)/i,
    wide: /^(p[řr]ed Kristem|pred na[šs][íi]m letopo[čc]tem|po Kristu|na[šs]eho letopo[čc]tu)/i
  };
  var parseEraPatterns2 = {
    any: [/^p[řr]/i, /^(po|n)/i]
  };
  var matchQuarterPatterns2 = {
    narrow: /^[1234]/i,
    abbreviated: /^[1234]\. [čc]tvrtlet[íi]/i,
    wide: /^[1234]\. [čc]tvrtlet[íi]/i
  };
  var parseQuarterPatterns2 = {
    any: [/1/i, /2/i, /3/i, /4/i]
  };
  var matchMonthPatterns2 = {
    narrow: /^[lúubdkčcszřrlp]/i,
    abbreviated: /^(led|[úu]no|b[řr]e|dub|kv[ěe]|[čc]vn|[čc]vc|srp|z[áa][řr]|[řr][íi]j|lis|pro)/i,
    wide: /^(leden|ledna|[úu]nora?|b[řr]ezen|b[řr]ezna|duben|dubna|kv[ěe]ten|kv[ěe]tna|[čc]erven(ec|ce)?|[čc]ervna|srpen|srpna|z[áa][řr][íi]|[řr][íi]jen|[řr][íi]jna|listopad(a|u)?|prosinec|prosince)/i
  };
  var parseMonthPatterns2 = {
    narrow: [/^l/i, /^[úu]/i, /^b/i, /^d/i, /^k/i, /^[čc]/i, /^[čc]/i, /^s/i, /^z/i, /^[řr]/i, /^l/i, /^p/i],
    any: [/^led/i, /^[úu]n/i, /^b[řr]e/i, /^dub/i, /^kv[ěe]/i, /^[čc]vn|[čc]erven(?!\w)|[čc]ervna/i, /^[čc]vc|[čc]erven(ec|ce)/i, /^srp/i, /^z[áa][řr]/i, /^[řr][íi]j/i, /^lis/i, /^pro/i]
  };
  var matchDayPatterns2 = {
    narrow: /^[npuúsčps]/i,
    short: /^(ne|po|[úu]t|st|[čc]t|p[áa]|so)/i,
    abbreviated: /^(ne|po|[úu]t|st|[čc]t|p[áa]|so)/i,
    wide: /^(ned[ěe]le|pond[ěe]l[íi]|[úu]ter[ýy]|st[řr]eda|[čc]tvrtek|p[áa]tek|sobota)/i
  };
  var parseDayPatterns2 = {
    narrow: [/^n/i, /^p/i, /^[úu]/i, /^s/i, /^[čc]/i, /^p/i, /^s/i],
    any: [/^ne/i, /^po/i, /^ut/i, /^st/i, /^[čc]t/i, /^p/i, /^so/i]
  };
  var matchDayPeriodPatterns2 = {
    any: /^dopoledne|dop\.?|odpoledne|odp\.?|půlnoc|poledne|r[áa]no|odpoledne|ve[čc]er|(v )?noci/i
  };
  var parseDayPeriodPatterns2 = {
    any: {
      am: /^dop/i,
      pm: /^odp/i,
      midnight: /^p[ůu]lnoc/i,
      noon: /^poledne/i,
      morning: /r[áa]no/i,
      afternoon: /odpoledne/i,
      evening: /ve[čc]er/i,
      night: /noc/i
    }
  };
  var match2 = {
    ordinalNumber: buildMatchPatternFn({
      matchPattern: matchOrdinalNumberPattern2,
      parsePattern: parseOrdinalNumberPattern2,
      valueCallback: function(value) {
        return parseInt(value, 10);
      }
    }),
    era: buildMatchFn({
      matchPatterns: matchEraPatterns2,
      defaultMatchWidth: "wide",
      parsePatterns: parseEraPatterns2,
      defaultParseWidth: "any"
    }),
    quarter: buildMatchFn({
      matchPatterns: matchQuarterPatterns2,
      defaultMatchWidth: "wide",
      parsePatterns: parseQuarterPatterns2,
      defaultParseWidth: "any",
      valueCallback: function(index) {
        return index + 1;
      }
    }),
    month: buildMatchFn({
      matchPatterns: matchMonthPatterns2,
      defaultMatchWidth: "wide",
      parsePatterns: parseMonthPatterns2,
      defaultParseWidth: "any"
    }),
    day: buildMatchFn({
      matchPatterns: matchDayPatterns2,
      defaultMatchWidth: "wide",
      parsePatterns: parseDayPatterns2,
      defaultParseWidth: "any"
    }),
    dayPeriod: buildMatchFn({
      matchPatterns: matchDayPeriodPatterns2,
      defaultMatchWidth: "any",
      parsePatterns: parseDayPeriodPatterns2,
      defaultParseWidth: "any"
    })
  };
  var match_default2 = match2;

  // node_modules/date-fns/esm/locale/cs/index.js
  var locale2 = {
    code: "cs",
    formatDistance: formatDistance2,
    formatLong: formatLong_default2,
    formatRelative: formatRelative2,
    localize: localize_default2,
    match: match_default2,
    options: {
      weekStartsOn: 1,
      firstWeekContainsDate: 4
    }
  };
  var cs_default = locale2;

  // lib/format.mjs
  var formatMoney = (x2) => {
    var _a, _b;
    return (_b = (_a = x2 == null ? void 0 : x2.toLocaleString("cs", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })) == null ? void 0 : _a.replace(/,00/g, ",-")) != null ? _b : null;
  };
  var formatPercents = (x2) => x2 != null ? `${Math.round(100 * x2).toLocaleString("cs")} %` : null;
  var formatDate = (x2) => {
    var _a;
    return (_a = x2 == null ? void 0 : x2.toLocaleString("cs", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })) != null ? _a : null;
  };

  // lib/chart.mjs
  Chart.register(LinearScale, LineController, LineElement, PointElement, TimeScale, plugin_tooltip);
  Chart.defaults.font.size = 12;
  Chart.defaults.font.family = "'bc-novatica-cyr', 'SF Pro', sans-serif";
  var CANVAS_ID = "hlidac-shopu-chart";
  var red = "#ff8787";
  var blue = "#5c62cd";
  var createChartData = (currentPrice, originalPrice, originalPriceLabel, currentPriceLabel) => ({
    labels: currentPrice.map((p2) => p2.x),
    datasets: [
      {
        data: originalPrice,
        label: originalPriceLabel,
        stepped: "after",
        backgroundColor: "#ffffff00",
        borderColor: blue,
        borderWidth: 2,
        borderCapStyle: "round",
        fill: false,
        pointRadius: 0,
        spanGaps: false
      },
      {
        data: currentPrice,
        label: "Doplněná prodejní cena",
        stepped: "after",
        backgroundColor: "#ffffff00",
        borderColor: red,
        borderWidth: 1,
        borderDash: [5, 10],
        borderCapStyle: "round",
        fill: false,
        pointRadius: 0,
        spanGaps: true
      },
      {
        data: currentPrice,
        label: currentPriceLabel,
        stepped: "after",
        backgroundColor: "#ffffff00",
        borderColor: red,
        borderWidth: 2,
        borderCapStyle: "round",
        fill: false,
        pointRadius: 0,
        spanGaps: false
      }
    ]
  });
  var tooltipStyles = {
    titleColor: "#1d3650",
    bodyColor: "#1d3650",
    bodySpacing: 4,
    backgroundColor: "#fcf4a7",
    borderColor: "#fbea61",
    borderWidth: 2,
    xPadding: 12,
    yPadding: 8,
    caretSize: 12
  };
  var tooltipFormatter = (originalPriceLabel, currentPriceLabel) => ({
    title(items) {
      const date = new Date(items[0].raw.x);
      return formatDate(date);
    },
    label(item) {
      if (item.datasetIndex === 0) {
        return `${originalPriceLabel}: ${formatMoney(item.raw.y)}`;
      } else if (item.datasetIndex === 1) {
        return `${currentPriceLabel}: ${formatMoney(item.raw.y)}`;
      }
    },
    labelColor(item) {
      const color2 = item.datasetIndex > 0 ? red : blue;
      return { backgroundColor: color2 };
    }
  });
  function configureScales(currentPrice) {
    const values = currentPrice.filter((p2) => p2.y !== null).map((p2) => p2.y);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const count = currentPrice.length;
    const stepSize = Math.floor(count / 12) || 1;
    return {
      x: {
        type: "time",
        time: {
          unit: "day",
          stepSize,
          displayFormats: { day: "d. MMM ’yy" }
        },
        adapters: { date: { locale: cs_default } }
      },
      y: {
        type: "linear",
        suggestedMax: max + 0.1 * max,
        suggestedMin: min - 0.1 * min,
        ticks: { callback: formatMoney }
      }
    };
  }
  var createChart = (ctx, currentPrice, originalPrice, originalPriceLabel, currentPriceLabel, maintainAspectRatio = true) => new Chart(ctx, {
    type: "line",
    locale: "cs",
    data: createChartData(currentPrice, originalPrice, originalPriceLabel, currentPriceLabel),
    options: {
      maintainAspectRatio,
      scales: configureScales(currentPrice),
      hover: {
        mode: "nearest",
        intersect: true
      },
      plugins: {
        tooltip: __spreadValues({
          mode: "index",
          intersect: false,
          position: "nearest",
          callbacks: tooltipFormatter(originalPriceLabel, currentPriceLabel)
        }, tooltipStyles)
      }
    }
  });
  var defineStyles = () => r2`
  .hs-legend {
    display: flex;
    justify-content: flex-end;
    font-size: 12px;
  }
  .hs-legend__point {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    margin-right: 5px;
    margin-top: 2px;
  }
  .hs-legend__point--original-price {
    background-color: ${o2(blue)};
  }
  .hs-legend__point--current-price {
    background-color: ${o2(red)};
    margin-left: 8px;
  }
`;
  var chartTemplate = (originalPriceLabel, currentPriceLabel, showLegend = true) => $`
  <div class="hs-chart-wrapper">
    ${showLegend ? $`
          <div class="hs-legend">
            <div
              class="hs-legend__point hs-legend__point--original-price"
            ></div>
            <span>${originalPriceLabel}</span>
            <div class="hs-legend__point hs-legend__point--current-price"></div>
            <span>${currentPriceLabel}</span>
          </div>
        ` : null}
    <canvas id="${CANVAS_ID}" width="100%"></canvas>
  </div>
`;
  var getCanvasContext = (element) => {
    const canvas = element.querySelector(`#${CANVAS_ID}`);
    return canvas.getContext("2d");
  };

  // node_modules/lit-html/directive.js
  var t3 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
  var e3 = (t4) => (...e5) => ({ _$litDirective$: t4, values: e5 });
  var i2 = class {
    constructor(t4) {
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    _$AT(t4, e5, i4) {
      this._$Ct = t4, this._$AM = e5, this._$Ci = i4;
    }
    _$AS(t4, e5) {
      return this.update(t4, e5);
    }
    update(t4, e5) {
      return this.render(...e5);
    }
  };

  // node_modules/lit-html/directives/class-map.js
  var o3 = e3(class extends i2 {
    constructor(t4) {
      var i4;
      if (super(t4), t4.type !== t3.ATTRIBUTE || t4.name !== "class" || ((i4 = t4.strings) === null || i4 === void 0 ? void 0 : i4.length) > 2)
        throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
    }
    render(t4) {
      return " " + Object.keys(t4).filter((i4) => t4[i4]).join(" ") + " ";
    }
    update(i4, [s4]) {
      var r3, o4;
      if (this.et === void 0) {
        this.et = /* @__PURE__ */ new Set(), i4.strings !== void 0 && (this.st = new Set(i4.strings.join(" ").split(/\s/).filter((t4) => t4 !== "")));
        for (const t4 in s4)
          s4[t4] && !((r3 = this.st) === null || r3 === void 0 ? void 0 : r3.has(t4)) && this.et.add(t4);
        return this.render(s4);
      }
      const e5 = i4.element.classList;
      this.et.forEach((t4) => {
        t4 in s4 || (e5.remove(t4), this.et.delete(t4));
      });
      for (const t4 in s4) {
        const i5 = !!s4[t4];
        i5 === this.et.has(t4) || ((o4 = this.st) === null || o4 === void 0 ? void 0 : o4.has(t4)) || (i5 ? (e5.add(t4), this.et.add(t4)) : (e5.remove(t4), this.et.delete(t4)));
      }
      return b;
    }
  });

  // node_modules/lit-html/directive-helpers.js
  var { H: i3 } = R;
  var e4 = () => document.createComment("");
  var u2 = (o4, t4, n3) => {
    var v2;
    const l2 = o4._$AA.parentNode, d2 = t4 === void 0 ? o4._$AB : t4._$AA;
    if (n3 === void 0) {
      const t5 = l2.insertBefore(e4(), d2), v3 = l2.insertBefore(e4(), d2);
      n3 = new i3(t5, v3, o4, o4.options);
    } else {
      const i4 = n3._$AB.nextSibling, t5 = n3._$AM, r3 = t5 !== o4;
      if (r3) {
        let i5;
        (v2 = n3._$AQ) === null || v2 === void 0 || v2.call(n3, o4), n3._$AM = o4, n3._$AP !== void 0 && (i5 = o4._$AU) !== t5._$AU && n3._$AP(i5);
      }
      if (i4 !== d2 || r3) {
        let o5 = n3._$AA;
        for (; o5 !== i4; ) {
          const i5 = o5.nextSibling;
          l2.insertBefore(o5, d2), o5 = i5;
        }
      }
    }
    return n3;
  };
  var c2 = (o4, i4, t4 = o4) => (o4._$AI(i4, t4), o4);
  var f2 = {};
  var s3 = (o4, i4 = f2) => o4._$AH = i4;
  var a2 = (o4) => o4._$AH;
  var m2 = (o4) => {
    var i4;
    (i4 = o4._$AP) === null || i4 === void 0 || i4.call(o4, false, true);
    let t4 = o4._$AA;
    const n3 = o4._$AB.nextSibling;
    for (; t4 !== n3; ) {
      const o5 = t4.nextSibling;
      t4.remove(), t4 = o5;
    }
  };

  // node_modules/lit-html/directives/repeat.js
  var u3 = (e5, s4, t4) => {
    const r3 = /* @__PURE__ */ new Map();
    for (let l2 = s4; l2 <= t4; l2++)
      r3.set(e5[l2], l2);
    return r3;
  };
  var c3 = e3(class extends i2 {
    constructor(e5) {
      if (super(e5), e5.type !== t3.CHILD)
        throw Error("repeat() can only be used in text expressions");
    }
    dt(e5, s4, t4) {
      let r3;
      t4 === void 0 ? t4 = s4 : s4 !== void 0 && (r3 = s4);
      const l2 = [], o4 = [];
      let i4 = 0;
      for (const s5 of e5)
        l2[i4] = r3 ? r3(s5, i4) : i4, o4[i4] = t4(s5, i4), i4++;
      return { values: o4, keys: l2 };
    }
    render(e5, s4, t4) {
      return this.dt(e5, s4, t4).values;
    }
    update(s4, [t4, r3, c4]) {
      var d2;
      const a3 = a2(s4), { values: p2, keys: v2 } = this.dt(t4, r3, c4);
      if (!Array.isArray(a3))
        return this.ut = v2, p2;
      const h3 = (d2 = this.ut) !== null && d2 !== void 0 ? d2 : this.ut = [], m3 = [];
      let y2, x2, j = 0, k2 = a3.length - 1, w2 = 0, A2 = p2.length - 1;
      for (; j <= k2 && w2 <= A2; )
        if (a3[j] === null)
          j++;
        else if (a3[k2] === null)
          k2--;
        else if (h3[j] === v2[w2])
          m3[w2] = c2(a3[j], p2[w2]), j++, w2++;
        else if (h3[k2] === v2[A2])
          m3[A2] = c2(a3[k2], p2[A2]), k2--, A2--;
        else if (h3[j] === v2[A2])
          m3[A2] = c2(a3[j], p2[A2]), u2(s4, m3[A2 + 1], a3[j]), j++, A2--;
        else if (h3[k2] === v2[w2])
          m3[w2] = c2(a3[k2], p2[w2]), u2(s4, a3[j], a3[k2]), k2--, w2++;
        else if (y2 === void 0 && (y2 = u3(v2, w2, A2), x2 = u3(h3, j, k2)), y2.has(h3[j]))
          if (y2.has(h3[k2])) {
            const e5 = x2.get(v2[w2]), t5 = e5 !== void 0 ? a3[e5] : null;
            if (t5 === null) {
              const e6 = u2(s4, a3[j]);
              c2(e6, p2[w2]), m3[w2] = e6;
            } else
              m3[w2] = c2(t5, p2[w2]), u2(s4, a3[j], t5), a3[e5] = null;
            w2++;
          } else
            m2(a3[k2]), k2--;
        else
          m2(a3[j]), j++;
      for (; w2 <= A2; ) {
        const e5 = u2(s4, m3[A2 + 1]);
        c2(e5, p2[w2]), m3[w2++] = e5;
      }
      for (; j <= k2; ) {
        const e5 = a3[j++];
        e5 !== null && m2(e5);
      }
      return this.ut = v2, s3(s4, m3), b;
    }
  });

  // lib/shops.mjs
  var aaaautoCz = {
    name: "AAAAuto.cz",
    currency: "CZK",
    logo: "aaaauto_logo",
    url: "https://www.aaaauto.cz/",
    viewBox: "0 0 99 20",
    parse(url) {
      return {
        itemId: url.searchParams.get("id"),
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var aaaautoSk = {
    name: "AAAAuto.sk",
    currency: "EUR",
    logo: "aaaauto_sk_logo",
    url: "https://www.aaaauto.sk/",
    viewBox: null,
    parse(url) {
      return {
        itemId: url.searchParams.get("id"),
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var alzaCz = {
    name: "Alza.cz",
    currency: "CZK",
    logo: "alza_logo",
    url: "https://www.alza.cz/",
    viewBox: "0 0 60 19",
    parse(url) {
      var _a, _b, _c, _d, _e;
      return {
        itemId: (_c = (_a = url.pathname.match(/d(\d+)\./)) == null ? void 0 : _a[1]) != null ? _c : (_b = url.searchParams) == null ? void 0 : _b.get("dq"),
        itemUrl: (_e = (_d = url.pathname.substring(1).match(/[^/]+$/)) == null ? void 0 : _d[0].replace(".htm", "")) != null ? _e : url.pathname.substring(1)
      };
    }
  };
  var alzaSk = {
    name: "Alza.sk",
    currency: "EUR",
    logo: "alza_sk_logo",
    url: "https://www.alza.sk/",
    viewBox: null,
    parse(url) {
      var _a, _b, _c, _d, _e;
      return {
        itemId: (_c = (_a = url.pathname.match(/d(\d+)\./)) == null ? void 0 : _a[1]) != null ? _c : (_b = url.searchParams) == null ? void 0 : _b.get("dq"),
        itemUrl: (_e = (_d = url.pathname.substring(1).match(/[^/]+$/)) == null ? void 0 : _d[0].replace(".htm", "")) != null ? _e : url.pathname.substring(1)
      };
    }
  };
  var alzaCoUk = {
    name: "Alza.uk",
    currency: "GBP",
    logo: "alza_uk_logo",
    url: "https://www.alza.co.uk/",
    viewBox: null,
    parse(url) {
      var _a, _b, _c, _d, _e;
      return {
        itemId: (_c = (_a = url.pathname.match(/d(\d+)\./)) == null ? void 0 : _a[1]) != null ? _c : (_b = url.searchParams) == null ? void 0 : _b.get("dq"),
        itemUrl: (_e = (_d = url.pathname.substring(1).match(/[^/]+$/)) == null ? void 0 : _d[0].replace(".htm", "")) != null ? _e : url.pathname.substring(1)
      };
    }
  };
  var alzaAt = {
    name: "Alza.at",
    currency: "EUR",
    logo: "alza_at_logo",
    url: "https://www.alza.at/",
    viewBox: null,
    parse(url) {
      var _a, _b, _c, _d, _e;
      return {
        itemId: (_c = (_a = url.pathname.match(/d(\d+)\./)) == null ? void 0 : _a[1]) != null ? _c : (_b = url.searchParams) == null ? void 0 : _b.get("dq"),
        itemUrl: (_e = (_d = url.pathname.substring(1).match(/[^/]+$/)) == null ? void 0 : _d[0].replace(".htm", "")) != null ? _e : url.pathname.substring(1)
      };
    }
  };
  var alzaHu = {
    name: "Alza.hu",
    currency: "HUF",
    logo: "alza_hu_logo",
    url: "https://www.alza.hu/",
    viewBox: null,
    parse(url) {
      var _a, _b, _c, _d, _e;
      return {
        itemId: (_c = (_a = url.pathname.match(/d(\d+)\./)) == null ? void 0 : _a[1]) != null ? _c : (_b = url.searchParams) == null ? void 0 : _b.get("dq"),
        itemUrl: (_e = (_d = url.pathname.substring(1).match(/[^/]+$/)) == null ? void 0 : _d[0].replace(".htm", "")) != null ? _e : url.pathname.substring(1)
      };
    }
  };
  var alzaDe = {
    name: "Alza.de",
    currency: "EUR",
    logo: "alza_de_logo",
    url: "https://www.alza.de/",
    viewBox: null,
    parse(url) {
      var _a, _b, _c, _d, _e;
      return {
        itemId: (_c = (_a = url.pathname.match(/d(\d+)\./)) == null ? void 0 : _a[1]) != null ? _c : (_b = url.searchParams) == null ? void 0 : _b.get("dq"),
        itemUrl: (_e = (_d = url.pathname.substring(1).match(/[^/]+$/)) == null ? void 0 : _d[0].replace(".htm", "")) != null ? _e : url.pathname.substring(1)
      };
    }
  };
  var benuCz = {
    name: "Benu.cz",
    currency: "CZK",
    logo: "benu_logo",
    url: "https://www.benu.cz/",
    viewBox: "0 0 67 18",
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.match(/\/([^/]+)/)) == null ? void 0 : _a[1]
      };
    }
  };
  var czcCz = {
    name: "CZC.cz",
    currency: "CZK",
    logo: "czc_logo",
    url: "https://www.czc.cz/",
    viewBox: "0 0 55 13",
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/\/(\d+.*)\//)) == null ? void 0 : _a[1].replace("a", ""),
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var conradCz = {
    name: "Conrad.cz",
    currency: "CZK",
    logo: "conrad_logo",
    url: "https://www.conrad.cz/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.substring(1).match(/[^-]+$/)) == null ? void 0 : _a[0]
      };
    }
  };
  var datartCz = {
    name: "Datart.cz",
    currency: "CZK",
    logo: "datart_logo",
    url: "https://www.datart.cz/",
    viewBox: "0 0 98 13",
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.substring(1).match(/([^/]+)\.html$/)) == null ? void 0 : _a[1]
      };
    }
  };
  var datartSk = {
    name: "Datart.sk",
    currency: "EUR",
    logo: "datart_sk_logo",
    url: "https://www.datart.sk/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.substring(1).match(/([^/]+)\.html$/)) == null ? void 0 : _a[1]
      };
    }
  };
  var dmCz = {
    name: "DM.cz",
    currency: "CZK",
    logo: "dm_logo",
    url: "https://www.dm.cz/",
    viewBox: "0 0 400 264.84375",
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/-p(\d+)\.html$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var mojaDmSk = {
    key: "dm_sk",
    name: "mojadm.sk",
    currency: "EUR",
    logo: "dm_logo",
    url: "https://www.mojadm.sk/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/-p(\d+)\.html$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var dmDe = {
    name: "DM.de",
    currency: "EUR",
    logo: "dm_logo",
    url: "https://www.dm.de/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/-p(\d+)\.html$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var dmAt = {
    name: "DM.at",
    currency: "EUR",
    logo: "dm_logo",
    url: "https://www.dm.at/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/-p(\d+)\.html$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var dmPl = {
    name: "DM.pl",
    currency: "PLN",
    logo: "dm_logo",
    url: "https://www.dm.pl/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/-p(\d+)\.html$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var dmHu = {
    name: "DM.hu",
    currency: "HUF",
    logo: "dm_logo",
    url: "https://www.dm.hu/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/-p(\d+)\.html$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var eCoopCz = {
    key: "e-coop_cz",
    name: "e-coop.cz",
    currency: "CZK",
    logo: "e-coop_logo",
    url: "https://www.e-coop.cz/",
    viewBox: null,
    parse(url) {
      var _a, _b, _c;
      return {
        itemId: null,
        itemUrl: ((_a = url.pathname.match(/([^/]+)\.html$/)) == null ? void 0 : _a[1]) ? (_b = url.pathname.match(/([^/]+)\.html$/)) == null ? void 0 : _b[1] : (_c = url.pathname.match(/s\/(.*)\/c/s)) == null ? void 0 : _c[1]
      };
    }
  };
  var electroworldCz = {
    name: "electroworld.cz",
    currency: "CZK",
    logo: "electroworld_logo",
    url: "https://www.electroworld.cz/",
    viewBox: "0 0 745.79 113.39",
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.match(/\/([^\/]+)/)) == null ? void 0 : _a[1]
      };
    }
  };
  var evaCz = {
    name: "eva.cz",
    currency: "CZK",
    logo: "eva_logo",
    url: "https://www.eva.cz/",
    viewBox: "0 0 400 154.4",
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/\/([^zbozi\/]+)\//)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var iGlobusCz = {
    key: "globus_cz",
    name: "iGlobus.cz",
    currency: "CZK",
    logo: "iglobus_logo",
    url: "https://www.iglobus.cz/",
    viewBox: null,
    parse(url) {
      var _a, _b, _c;
      return {
        itemId: null,
        itemUrl: (_c = (_a = url.hash.match(/#(.+)/)) == null ? void 0 : _a[1]) != null ? _c : (_b = url.pathname.match(/\/[^/]+\/([^/]+)$/)) == null ? void 0 : _b[1]
      };
    }
  };
  var ikeaCz = {
    name: "ikea.cz",
    currency: "CZK",
    logo: "ikea_logo",
    url: "https://www.ikea.com/cz/cs/",
    viewBox: "0 0 400 160.15625",
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/(\d+)\//)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var ikeaSk = {
    name: "ikea.sk",
    currency: "EUR",
    logo: "ikea_logo",
    url: "https://www.ikea.com/sk/sk/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/(\d+)\//)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var ikeaPl = {
    name: "ikea.pl",
    currency: "PLN",
    logo: "ikea_logo",
    url: "https://www.ikea.com/pl/pl/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/(\d+)\//)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var ikeaAt = {
    name: "ikea.at",
    currency: "EUR",
    logo: "ikea_logo",
    url: "https://www.ikea.com/at/de/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/(\d+)\//)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var ikeaDe = {
    name: "ikea.de",
    currency: "EUR",
    logo: "ikea_logo",
    url: "https://www.ikea.com/de/de/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/(\d+)\//)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var ikeaHu = {
    name: "ikea.hu",
    currency: "HUF",
    logo: "ikea_logo",
    url: "https://www.ikea.com/hu/hu/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/(\d+)\//)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var iTescoCz = {
    name: "iTesco.cz",
    currency: "CZK",
    logo: "itesco_logo",
    url: "https://www.itesco.cz/",
    viewBox: "0 0 55 18",
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/(\d+)$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var iTescoSk = {
    name: "iTesco.sk",
    currency: "EUR",
    logo: "itesco_sk_logo",
    url: "https://www.itesco.sk/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/(\d+)$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var kasaCz = {
    name: "Kasa.cz",
    currency: "CZK",
    logo: "kasa_logo",
    url: "https://www.kasa.cz/",
    viewBox: "0 0 70 18",
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.match(/\/([^/]+)/)) == null ? void 0 : _a[1]
      };
    }
  };
  var knihydobrovskyCz = {
    name: "knihydobrovsky.cz",
    currency: "CZK",
    logo: "knihydobrovsky_logo",
    url: "https://www.knihydobrovsky.cz/",
    viewBox: "0 0 220 54",
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.match(/[^\\\/]+$/g)) == null ? void 0 : _a[0]
      };
    }
  };
  var kosikCz = {
    name: "Košík.cz",
    currency: "CZK",
    logo: "kosik_logo",
    url: "https://www.kosik.cz/",
    viewBox: "0 0 71 22",
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.match(/[^/]+$/)) == null ? void 0 : _a[0]
      };
    }
  };
  var lekarnaCz = {
    name: "Lékárna.cz",
    currency: "CZK",
    logo: "lekarna_logo",
    url: "https://www.lekarna.cz/",
    viewBox: "0 0 79 20",
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.substring(1).match(/(?:[^/]+\/)?([^/]+)/)) == null ? void 0 : _a[1]
      };
    }
  };
  var lidlCz = {
    name: "lidl.cz",
    currency: "CZK",
    logo: "lidl_logo",
    url: "https://www.lidl.cz/",
    viewBox: "0 0 400 400",
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/\/p(\d+)/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var tchiboCz = {
    name: "tchibo.cz",
    currency: "CZK",
    logo: "tchibo_logo",
    url: "https://www.tchibo.cz/",
    viewBox: "0 0 400 400",
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.substring(1).match(/([^/]+)\.html$/)) == null ? void 0 : _a[1]
      };
    }
  };
  var tchiboSk = {
    name: "tchibo.sk",
    currency: "EUR",
    logo: "tchibo_logo",
    url: "https://www.tchibo.sk/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.substring(1).match(/([^/]+)\.html$/)) == null ? void 0 : _a[1]
      };
    }
  };
  var mallCz = {
    name: "Mall.cz",
    currency: "CZK",
    logo: "mall_logo",
    url: "https://www.mall.cz/",
    viewBox: "0 0 68 19",
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.substring(1).match(/[^/]+$/)) == null ? void 0 : _a[0]
      };
    }
  };
  var mallSk = {
    name: "Mall.sk",
    currency: "EUR",
    logo: "mall_sk_logo",
    url: "https://www.mall.sk/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.substring(1).match(/[^/]+$/)) == null ? void 0 : _a[0]
      };
    }
  };
  var magapixelCz = {
    name: "Megapixel.cz",
    currency: "CZK",
    logo: "megapixel_logo",
    url: "https://www.megapixel.cz/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.substring(1).match(/[^\/]+$/)) == null ? void 0 : _a[0]
      };
    }
  };
  var luxorCz = {
    name: "Luxor.cz",
    currency: "CZK",
    logo: "luxor_logo",
    url: "https://www.luxor.cz/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.substring(1).match(/[^\/]+$/)) == null ? void 0 : _a[0]
      };
    }
  };
  var mironetCz = {
    name: "Mironet.cz",
    currency: "CZK",
    logo: "mironet_logo",
    url: "https://www.mironet.cz/",
    viewBox: "0 0 59 20",
    parse(url) {
      return {
        itemId: null,
        itemUrl: url.pathname.replace(/\//g, "")
      };
    }
  };
  var mountfieldCz = {
    name: "Mountfield.cz",
    currency: "CZK",
    logo: "mountfield_logo",
    url: "https://www.mountfield.cz/",
    viewBox: "0 0 64 11",
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/-([^-]+)$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var dekCz = {
    name: "Dek.cz",
    currency: "CZK",
    logo: "dek_logo",
    url: "https://www.dek.cz/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/\/(\d+)-/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var dekSk = {
    name: "Dek.sk",
    currency: "EUR",
    logo: "dek_logo",
    url: "https://www.dek.sk/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/\/(\d+)-/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var mountfieldSk = {
    name: "Mountfield.sk",
    currency: "EUR",
    logo: "mountfield_sk_logo",
    url: "https://www.mountfield.sk/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/-([^-]+)$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var hornbachCz = {
    name: "hornbach.cz",
    currency: "CZK",
    logo: "hornbach_logo",
    url: "https://www.hornbach.cz/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/(\d+)\/artikl.html/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var hornbachSk = {
    name: "hornbach.sk",
    currency: "EUR",
    logo: "hornbach_logo",
    url: "https://www.hornbach.sk/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/(\d+)\/artikel.html/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var notinoCz = {
    name: "Notino.cz",
    currency: "CZK",
    logo: "notino_logo",
    url: "https://www.notino.cz/",
    viewBox: "0 0 68 13",
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.substring(1).replace(/\//g, "")) == null ? void 0 : _a[1]
      };
    }
  };
  var notinoSk = {
    name: "Notino.sk",
    currency: "EUR",
    logo: "notino_sk_logo",
    url: "https://www.notino.sk/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.substring(1).replace(/\//g, "")) == null ? void 0 : _a[1]
      };
    }
  };
  var obiCz = {
    name: "obi.cz",
    currency: "CZK",
    logo: "obi_logo",
    url: "https://www.obi.cz/",
    viewBox: "0 0 400 99.375",
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/p\/(\d+)(#\/)?$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var obiSk = {
    name: "obi.sk",
    currency: "EUR",
    logo: "obi_logo",
    url: "https://www.obi.sk/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/p\/(\d+)(#\/)?$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var obiPl = {
    name: "obi.sk",
    currency: "PLN",
    logo: "obi_logo",
    url: "https://www.obi.pl/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/p\/(\d+)(#\/)?$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var obiHu = {
    name: "obi.sk",
    currency: "HUF",
    logo: "obi_logo",
    url: "https://www.obi.hu/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/p\/(\d+)(#\/)?$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var obiItaliaIt = {
    name: "obi-italia.it",
    currency: "HUF",
    logo: "obi_logo",
    url: "https://www.obi-italia.it/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/p\/(\d+)(#\/)?$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var obiDe = {
    name: "obi.de",
    currency: "EUR",
    logo: "obi_logo",
    url: "https://www.obi.de/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/p\/(\d+)(#\/)?$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var obiAt = {
    name: "obi.at",
    currency: "EUR",
    logo: "obi_logo",
    url: "https://www.obi.at/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/p\/(\d+)(#\/)?$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var obiRu = {
    name: "obi.ru",
    currency: "EUR",
    logo: "obi_logo",
    url: "https://www.obi.ru/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/p\/(\d+)(#\/)?$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var obiCh = {
    name: "obi.ch",
    currency: "EUR",
    logo: "obi_logo",
    url: "https://www.obi.ch/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/p\/(\d+)(#\/)?$/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var okayCz = {
    name: "Okay.cz",
    currency: "CZK",
    logo: "okay_logo",
    url: "https://www.okay.cz/",
    viewBox: "0 0 53 20",
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.match(/[^\/]+$/g)) == null ? void 0 : _a[0]
      };
    }
  };
  var okaySk = {
    name: "Okay.sk",
    currency: "EUR",
    logo: "okay_sk_logo",
    url: "https://www.okay.sk/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.match(/[^\/]+$/g)) == null ? void 0 : _a[0]
      };
    }
  };
  var pilulkaCz = {
    name: "Pilulka.cz",
    currency: "CZK",
    logo: "pilulka_logo",
    url: "https://www.pilulka.cz/",
    viewBox: "0 0 86 20",
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.match(/\/([^/]+)/)) == null ? void 0 : _a[1]
      };
    }
  };
  var pilulkaSk = {
    name: "Pilulka.sk",
    currency: "EUR",
    logo: "pilulka_sk_logo",
    url: "https://www.pilulka.sk/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.match(/\/([^/]+)/)) == null ? void 0 : _a[1]
      };
    }
  };
  var prozdraviCz = {
    name: "Prozdraví.cz",
    currency: "CZK",
    logo: "prozdravi_logo",
    url: "https://www.prozdravi.cz/",
    viewBox: "0 0 91 20",
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.match(/[^/]+$/)) == null ? void 0 : _a[0].replace(".html", "")
      };
    }
  };
  var rohlikCz = {
    name: "Rohlík.cz",
    currency: "CZK",
    logo: "rohlik_logo",
    url: "https://www.rohlik.cz/",
    viewBox: "0 0 51 28",
    parse(url) {
      var _a, _b, _c, _d;
      return {
        itemId: (_d = (_b = (_a = url.searchParams.get("productPopup")) == null ? void 0 : _a.match(/^(\d+)/)) == null ? void 0 : _b[1]) != null ? _d : (_c = url.pathname.substring(1).match(/^(\d+)/)) == null ? void 0 : _c[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var rozetkaComUa = {
    name: "Rozetka",
    currency: "UAH",
    logo: "rozetka_logo",
    url: "https://rozetka.com.ua/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/p(\d+)/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var sLekyCz = {
    name: "sLéky.cz",
    currency: "CZK",
    logo: "sleky_logo",
    url: "https://www.sleky.cz/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.match(/\/([^/]+)/)) == null ? void 0 : _a[1]
      };
    }
  };
  var tetadrogerieCz = {
    name: "Teta Drogerie",
    currency: "CZK",
    logo: "teta_logo",
    url: "https://www.tetadrogerie.cz/",
    viewBox: "0 0 1744 436",
    parse(url) {
      return {
        itemId: null,
        itemUrl: url.pathname.replace("/eshop/katalog/", "")
      };
    }
  };
  var tsbohemiaCz = {
    name: "TSBohemia.cz",
    currency: "CZK",
    logo: "tsbohemia_logo",
    url: "https://www.tsbohemia.cz/",
    viewBox: "0 0 115 15",
    parse(url) {
      var _a;
      return {
        itemId: (_a = url.pathname.match(/d(\d+)\.html/)) == null ? void 0 : _a[1],
        get itemUrl() {
          return this.itemId;
        }
      };
    }
  };
  var makroCz = {
    name: "makro.cz",
    currency: "CZK",
    logo: "makro_logo",
    url: "https://www.makro.cz/",
    viewBox: null,
    parse(url) {
      var _a;
      return {
        itemId: null,
        itemUrl: (_a = url.pathname.substring(1).match(/(\d+)p\//)) == null ? void 0 : _a[1]
      };
    }
  };
  var shops = /* @__PURE__ */ new Map([
    ["aaaauto", aaaautoCz],
    ["aaaauto.cz", aaaautoCz],
    ["aaaauto_sk", aaaautoSk],
    ["aaaauto.sk", aaaautoSk],
    ["alza", alzaCz],
    ["alza.cz", alzaCz],
    ["alza_sk", alzaSk],
    ["alza.sk", alzaSk],
    ["alza_uk", alzaCoUk],
    ["alza.co.uk", alzaCoUk],
    ["alza_at", alzaAt],
    ["alza.at", alzaAt],
    ["alza_hu", alzaHu],
    ["alza.hu", alzaHu],
    ["alza_de", alzaDe],
    ["alza.de", alzaDe],
    ["benu", benuCz],
    ["benu.cz", benuCz],
    ["czc", czcCz],
    ["czc.cz", czcCz],
    ["conrad.cz", conradCz],
    ["datart", datartCz],
    ["datart.cz", datartCz],
    ["datart_sk", datartSk],
    ["datart.sk", datartSk],
    ["dek_cz", dekCz],
    ["dek.cz", dekCz],
    ["dek_sk", dekSk],
    ["dek.sk", dekSk],
    ["dm_cz", dmCz],
    ["dm.cz", dmCz],
    ["mojadm_sk", mojaDmSk],
    ["mojadm.sk", mojaDmSk],
    ["dm_de", dmDe],
    ["dm.de", dmDe],
    ["dm_at", dmAt],
    ["dm.at", dmAt],
    ["dm_pl", dmPl],
    ["dm.pl", dmPl],
    ["dm_hu", dmHu],
    ["dm.hu", dmHu],
    ["e-coop", eCoopCz],
    ["e-coop.cz", eCoopCz],
    ["electroworld_cz", electroworldCz],
    ["electroworld.cz", electroworldCz],
    ["eva_cz", evaCz],
    ["eva.cz", evaCz],
    ["hornbach", hornbachCz],
    ["hornbach.cz", hornbachCz],
    ["hornbach_sk", hornbachSk],
    ["hornbach.sk", hornbachSk],
    ["iglobus", iGlobusCz],
    ["iglobus.cz", iGlobusCz],
    ["ikea_cz", ikeaCz],
    ["ikea.cz", ikeaCz],
    ["ikea_sk", ikeaSk],
    ["ikea.sk", ikeaSk],
    ["ikea_pl", ikeaPl],
    ["ikea.pl", ikeaPl],
    ["ikea_at", ikeaAt],
    ["ikea.at", ikeaAt],
    ["ikea_de", ikeaDe],
    ["ikea.de", ikeaDe],
    ["ikea_hu", ikeaHu],
    ["ikea.hu", ikeaHu],
    ["itesco", iTescoCz],
    ["itesco.cz", iTescoCz],
    ["itesco_sk", iTescoSk],
    ["itesco.sk", iTescoSk],
    ["kasa", kasaCz],
    ["kasa.cz", kasaCz],
    ["knihydobrovsky_cz", knihydobrovskyCz],
    ["knihydobrovsky.cz", knihydobrovskyCz],
    ["kosik", kosikCz],
    ["kosik.cz", kosikCz],
    ["lekarna", lekarnaCz],
    ["lekarna.cz", lekarnaCz],
    ["lidl_cz", lidlCz],
    ["lidl.cz", lidlCz],
    ["luxor_cz", luxorCz],
    ["luxor.cz", luxorCz],
    ["makro", makroCz],
    ["makro.cz", makroCz],
    ["mall", mallCz],
    ["mall.cz", mallCz],
    ["mall_sk", mallSk],
    ["mall.sk", mallSk],
    ["megapixel_cz", magapixelCz],
    ["megapixel.cz", magapixelCz],
    ["mironet", mironetCz],
    ["mironet.cz", mironetCz],
    ["mountfield", mountfieldCz],
    ["mountfield.cz", mountfieldCz],
    ["mountfield_sk", mountfieldSk],
    ["mountfield.sk", mountfieldSk],
    ["notino", notinoCz],
    ["notino.cz", notinoCz],
    ["notino_sk", notinoSk],
    ["notino.sk", notinoSk],
    ["obi_cz", obiCz],
    ["obi.cz", obiCz],
    ["obi_sk", obiSk],
    ["obi.sk", obiSk],
    ["obi_pl", obiPl],
    ["obi.pl", obiPl],
    ["obi_hu", obiHu],
    ["obi.hu", obiHu],
    ["obi-italia_it", obiItaliaIt],
    ["obi-italia.it", obiItaliaIt],
    ["obi_de", obiDe],
    ["obi.de", obiDe],
    ["obi_at", obiAt],
    ["obi.at", obiAt],
    ["obi_ru", obiRu],
    ["obi.ru", obiRu],
    ["obi_ch", obiCh],
    ["obi.ch", obiCh],
    ["okay_cz", okayCz],
    ["okay.cz", okayCz],
    ["okay_sk", okaySk],
    ["okay.sk", okaySk],
    ["pilulka", pilulkaCz],
    ["pilulka.cz", pilulkaCz],
    ["pilulka_sk", pilulkaSk],
    ["pilulka.sk", pilulkaSk],
    ["prozdravi", prozdraviCz],
    ["prozdravi.cz", prozdraviCz],
    ["rohlik", rohlikCz],
    ["rohlik.cz", rohlikCz],
    ["rozetka_com_ua", rozetkaComUa],
    ["rozetka.com.ua", rozetkaComUa],
    ["sleky", sLekyCz],
    ["sleky.cz", sLekyCz],
    ["tetadrogerie_cz", tetadrogerieCz],
    ["tetadrogerie.cz", tetadrogerieCz],
    ["tchibo_cz", tchiboCz],
    ["tchibo.cz", tchiboCz],
    ["tchibo_sk", tchiboSk],
    ["tchibo.sk", tchiboSk],
    ["tsbohemia", tsbohemiaCz],
    ["tsbohemia.cz", tsbohemiaCz]
  ]);
  var twoLevelTLDs = /* @__PURE__ */ new Set(["uk", "ua", "tr"]);
  var countryInUrl = /* @__PURE__ */ new Set(["ikea"]);
  function shopName(s4, options = {}) {
    const { getFullKey = false } = options;
    const url = new URL(s4);
    const domainParts = url.host.split(".");
    let domain = domainParts.pop();
    let shopName2 = domainParts.pop();
    if (twoLevelTLDs.has(domain)) {
      domain = `${shopName2}_${domain}`;
      shopName2 = domainParts.pop();
    }
    if (countryInUrl.has(shopName2)) {
      domain = url.pathname.split("/")[1];
    }
    const fullKey = `${shopName2}_${domain}`;
    if (getFullKey)
      return fullKey;
    if (shops.get(fullKey))
      return fullKey;
    if (shops.get(shopName2))
      return shopName2;
    return null;
  }

  // lib/templates.mjs
  var when = e3(class extends i2 {
    render(condition, trueContentProvider) {
      if (condition)
        return trueContentProvider();
    }
  });
  function widgetStyles() {
    return r2`
    #hlidacShopu {
      font-family: "bc-novatica-cyr", sans-serif;
      font-kerning: normal;
      font-variant-numeric: lining-nums;
      -webkit-text-size-adjust: 100%;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
      font-size: 13px;
      text-align: left;
      color: #000;
      background-color: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 14px;
      padding: 8px;
      clear: both;
    }

    #hlidacShopu * {
      font-family: inherit;
    }

    .hs-header {
      background: #fff;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      margin-bottom: 8px;
      position: static;
      width: initial;
    }

    .hs-header > :first-child {
      flex-grow: 3;
      margin-left: 8px;
      margin-bottom: 8px;
    }

    .hs-header .hs-logo {
      margin-top: 8px;
      margin-right: 16px;
    }

    .hs-header .hs-logo svg {
      transform: translateY(4px);
    }

    .hs-footer {
      display: flex;
      justify-content: space-between;
      padding-bottom: initial;
      margin-top: 16px;
      margin-bottom: initial;
      background: initial;
      width: initial;
    }

    .hs-footer div {
      font-size: 12px;
      color: #979797;
    }

    .hs-footer a {
      color: #545fef;
    }

    .hs-original-price {
      margin-top: 1px;
      line-height: 1.6;
    }

    .hs-original-price data {
      color: #ca0505;
      font-size: 16px;
      font-weight: 700;
    }
    .hs-header__discount {
      align-self: flex-start;
      flex-grow: 2;
    }

    .hs-real-discount {
      background-color: #ffe607;
      color: #1d3650;
      border-radius: 4px;
      text-align: center;
      line-height: 1.4;
      padding: 6px 10px 6px;
    }

    .hs-real-discount a {
      color: #1d3650;
      text-decoration: underline;
    }

    .hs-real-discount.hs-real-discount--good {
      background-color: #5dbd2f;
      color: #fff;
    }

    .hs-real-discount.hs-real-discount--neutral {
      background-color: #f7f7ff;
    }

    .hs-real-discount.hs-real-discount--negative {
      background-color: #ca0505;
      color: #fff;
    }
    .hs-real-discount.hs-real-discount--good a:visited,
    .hs-real-discount.hs-real-discount--good a:link,
    .hs-real-discount.hs-real-discount--negative a:visited,
    .hs-real-discount.hs-real-discount--negative a:link {
      color: #fff;
    }

    .hs-real-discount.hs-real-discount--no-data {
      display: none;
    }

    .hs-real-discount data {
      font-size: 2em;
      line-height: 1.2;
      font-weight: 700;
      display: block;
    }

    .hs-claimed-discount {
      line-height: 1.6;
      text-align: center;
    }

    ${defineStyles()}
  `;
  }
  var logo = y`
  <svg
    width="184"
    height="29"
    viewBox="0 0 184 29"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Hlídačshopů.cz</title>
    <path
      d="M38.2236 7.38201V20H41.5176V15.158H46.6116V20H49.9056V7.38201H46.6116V12.53H41.5176V7.38201H38.2236Z"
      fill="black"
    />
    <path
      d="M52.4464 6.64401V20H55.6504V6.64401H52.4464Z"
      fill="black"
    />
    <path
      d="M60.1184 6.14001L58.1924 9.23601H60.6224L62.9804 7.14801L60.1184 6.14001ZM58.1924 10.262V20H61.3784V10.262H58.1924Z"
      fill="black"
    />
    <path
      d="M70.459 6.64401V11.54C69.775 10.658 68.767 10.154 67.507 10.154C64.825 10.154 63.043 12.116 63.043 15.086C63.043 18.11 64.843 20.126 67.579 20.126C68.803 20.126 69.793 19.64 70.459 18.74V20H73.663V6.64401H70.459ZM68.371 17.606C67.111 17.606 66.265 16.616 66.265 15.176C66.265 13.736 67.111 12.746 68.371 12.746C69.613 12.746 70.459 13.718 70.459 15.176C70.459 16.616 69.613 17.606 68.371 17.606Z"
      fill="black"
    />
    <path
      d="M80.5844 10.136C78.9824 10.136 77.5784 10.514 76.0484 11.198L76.9304 13.358C77.9744 12.854 79.0364 12.584 79.8464 12.584C81.0704 12.584 81.7004 13.124 81.7004 14.042V14.15H79.1624C76.7504 14.186 75.4364 15.248 75.4364 17.102C75.4364 18.884 76.6784 20.144 78.7664 20.144C80.0804 20.144 81.0704 19.712 81.7004 18.902V20H84.8504V13.664C84.8324 11.432 83.2664 10.136 80.5844 10.136ZM79.7564 17.966C78.9284 17.966 78.4424 17.534 78.4424 16.868C78.4424 16.184 78.8924 15.86 79.7924 15.86H81.7004V16.706C81.5024 17.444 80.7104 17.966 79.7564 17.966Z"
      fill="black"
    />
    <path
      d="M87.3989 6.28401L89.5949 9.27201H92.3669L94.5629 6.28401H92.0789L90.9809 7.92201L89.8829 6.28401H87.3989ZM93.2849 13.808L95.6069 12.458C94.7609 11 93.2129 10.154 91.2509 10.154C88.2269 10.154 86.2109 12.152 86.2109 15.176C86.2109 18.146 88.2089 20.108 91.2149 20.108C93.2849 20.108 94.8689 19.262 95.6429 17.768L93.2849 16.418C92.8889 17.174 92.2229 17.516 91.3769 17.516C90.2249 17.516 89.4329 16.58 89.4329 15.158C89.4329 13.754 90.2249 12.8 91.3769 12.8C92.2049 12.8 92.8529 13.178 93.2849 13.808Z"
      fill="black"
    />
    <path
      d="M103.608 13.34L104.688 11.252C103.464 10.514 102.042 10.118 100.638 10.118C98.3524 10.118 96.6424 11.234 96.6424 13.268C96.6424 16.634 101.664 15.968 101.664 17.3C101.664 17.696 101.232 17.894 100.638 17.894C99.5584 17.894 98.2984 17.462 97.1824 16.688L96.1744 18.758C97.3624 19.676 98.9284 20.144 100.566 20.144C102.942 20.144 104.688 19.01 104.688 17.012C104.706 13.628 99.5944 14.24 99.5944 12.962C99.5944 12.548 99.9724 12.35 100.512 12.35C101.304 12.35 102.402 12.71 103.608 13.34Z"
      fill="black"
    />
    <path
      d="M112.925 10.136C111.503 10.136 110.387 10.73 109.703 11.846V6.64401H106.499V20H109.703V15.194C109.703 13.916 110.423 13.016 111.611 12.998C112.637 12.998 113.267 13.682 113.267 14.78V20H116.471V13.862C116.471 11.576 115.067 10.136 112.925 10.136Z"
      fill="black"
    />
    <path
      d="M123.144 10.154C119.94 10.154 117.834 12.134 117.834 15.122C117.834 18.128 119.94 20.108 123.144 20.108C126.348 20.108 128.472 18.128 128.472 15.122C128.472 12.134 126.348 10.154 123.144 10.154ZM123.144 12.746C124.404 12.746 125.25 13.718 125.25 15.176C125.25 16.616 124.404 17.588 123.144 17.588C121.902 17.588 121.056 16.616 121.056 15.176C121.056 13.718 121.902 12.746 123.144 12.746Z"
      fill="black"
    />
    <path
      d="M136.26 10.154C135.054 10.154 134.082 10.64 133.398 11.522V10.262H130.194V23.492H133.398V18.74C134.082 19.622 135.09 20.108 136.332 20.108C139.032 20.108 140.796 18.146 140.796 15.176C140.796 12.152 138.978 10.154 136.26 10.154ZM135.468 17.516C134.244 17.516 133.398 16.544 133.398 15.104C133.398 13.664 134.244 12.674 135.468 12.674C136.728 12.674 137.574 13.664 137.574 15.104C137.574 16.544 136.728 17.516 135.468 17.516Z"
      fill="black"
    />
    <path
      d="M147.106 9.65001C148.312 9.65001 149.284 8.67801 149.284 7.49001C149.284 6.28401 148.312 5.31201 147.106 5.31201C145.9 5.31201 144.928 6.28401 144.928 7.49001C144.928 8.67801 145.9 9.65001 147.106 9.65001ZM147.106 6.59001C147.61 6.59001 148.024 6.98601 148.024 7.49001C148.024 7.97601 147.61 8.37201 147.106 8.37201C146.602 8.37201 146.188 7.97601 146.188 7.49001C146.188 6.98601 146.602 6.59001 147.106 6.59001ZM148.744 10.262V15.068C148.744 16.346 148.06 17.246 146.926 17.264C145.972 17.264 145.36 16.598 145.36 15.5V10.262H142.156V16.418C142.156 18.686 143.524 20.144 145.63 20.144C147.016 20.126 148.078 19.55 148.744 18.416V20H151.948V10.262H148.744Z"
      fill="black"
    />
    <path
      d="M156.53 16.876C155.63 16.876 155 17.506 155 18.424C155 19.342 155.63 19.99 156.53 19.99C157.43 19.99 158.078 19.342 158.078 18.424C158.078 17.506 157.43 16.876 156.53 16.876Z"
      fill="#545FEF"
    />
    <path
      d="M166.252 13.654L168.574 12.304C167.728 10.846 166.18 10 164.218 10C161.194 10 159.178 11.998 159.178 15.022C159.178 17.992 161.176 19.954 164.182 19.954C166.252 19.954 167.836 19.108 168.61 17.614L166.252 16.264C165.856 17.02 165.19 17.362 164.344 17.362C163.192 17.362 162.4 16.426 162.4 15.004C162.4 13.6 163.192 12.646 164.344 12.646C165.172 12.646 165.82 13.024 166.252 13.654Z"
      fill="#545FEF"
    />
    <path
      d="M169.628 10.108V12.574H174.146L169.466 17.902V19.846H178.34V17.398H173.48L178.16 12.07V10.126L169.628 10.108Z"
      fill="#545FEF"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M2.03844 8.18182H27.9616C29.0874 8.18182 30 9.10711 30 10.2284V11.5898C30 12.6987 29.12 13.6016 28.0251 13.6354L25.8605 23.376C25.5456 24.7934 24.1637 25.9091 22.7147 25.9091H21.1435H9H7.42889C5.97984 25.9091 4.59798 24.7934 4.28302 23.376L2.11865 13.6364H2.03844C0.912639 13.6364 0 12.7111 0 11.5898V10.2284C0 9.09811 0.914221 8.18182 2.03844 8.18182ZM9.97322 24.5455H20.1703H22.7147C23.5228 24.5455 24.3527 23.8754 24.5294 23.0802L26.628 13.6364H3.51555L5.61418 23.0802C5.79088 23.8754 6.62079 24.5455 7.42889 24.5455H9.97322ZM1.36364 11.5898C1.36364 11.9632 1.67099 12.2727 2.03844 12.2727H27.9616C28.3322 12.2727 28.6364 11.9675 28.6364 11.5898V10.2284C28.6364 9.85498 28.329 9.54545 27.9616 9.54545H2.03844C1.66785 9.54545 1.36364 9.85072 1.36364 10.2284V11.5898Z"
      fill="#545FEF"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M14.0987 1.18282C14.3754 0.927412 14.3927 0.496054 14.1373 0.219358C13.8819 -0.0573381 13.4505 -0.0745924 13.1738 0.180819L4.31018 8.36264C4.03348 8.61805 4.01623 9.04941 4.27164 9.3261C4.52705 9.6028 4.95841 9.62005 5.23511 9.36464L14.0987 1.18282Z"
      fill="#545FEF"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M16.8259 0.180819C16.5492 -0.0745924 16.1179 -0.0573381 15.8625 0.219358C15.607 0.496054 15.6243 0.927412 15.901 1.18282L24.7646 9.36464C25.0413 9.62005 25.4727 9.6028 25.7281 9.3261C25.9835 9.04941 25.9663 8.61805 25.6896 8.36264L16.8259 0.180819Z"
      fill="#545FEF"
    />
    <path
      d="M14.6354 16.9718C14.6354 17.2583 14.5851 17.5198 14.4844 17.7562C14.3837 17.9926 14.25 18.1968 14.0833 18.3687C13.9167 18.537 13.7222 18.6678 13.5 18.7609C13.2812 18.854 13.0521 18.9006 12.8125 18.9006C12.5486 18.9006 12.3056 18.854 12.0833 18.7609C11.8646 18.6678 11.6736 18.537 11.5104 18.3687C11.3507 18.1968 11.2257 17.9926 11.1354 17.7562C11.0451 17.5198 11 17.2583 11 16.9718C11 16.6745 11.0451 16.4059 11.1354 16.1659C11.2257 15.9223 11.3507 15.7146 11.5104 15.5426C11.6736 15.3707 11.8646 15.2382 12.0833 15.1451C12.3056 15.0484 12.5486 15 12.8125 15C13.0764 15 13.3194 15.0484 13.5417 15.1451C13.7674 15.2382 13.9601 15.3707 14.1198 15.5426C14.283 15.7146 14.4097 15.9223 14.5 16.1659C14.5903 16.4059 14.6354 16.6745 14.6354 16.9718ZM13.3958 16.9718C13.3958 16.7891 13.3802 16.6387 13.349 16.5205C13.3212 16.3987 13.2812 16.302 13.2292 16.2304C13.1771 16.1587 13.1146 16.1086 13.0417 16.0799C12.9722 16.0513 12.8958 16.0369 12.8125 16.0369C12.7292 16.0369 12.6528 16.0513 12.5833 16.0799C12.5139 16.1086 12.4549 16.1587 12.4063 16.2304C12.3576 16.302 12.3194 16.3987 12.2917 16.5205C12.2639 16.6387 12.25 16.7891 12.25 16.9718C12.25 17.1437 12.2639 17.287 12.2917 17.4016C12.3194 17.5162 12.3576 17.6076 12.4063 17.6756C12.4549 17.7437 12.5139 17.792 12.5833 17.8207C12.6528 17.8493 12.7292 17.8637 12.8125 17.8637C12.8958 17.8637 12.9722 17.8493 13.0417 17.8207C13.1146 17.792 13.1771 17.7437 13.2292 17.6756C13.2812 17.6076 13.3212 17.5162 13.349 17.4016C13.3802 17.287 13.3958 17.1437 13.3958 16.9718ZM17.0208 15.3224C17.0729 15.2615 17.1372 15.206 17.2135 15.1558C17.2899 15.1021 17.3958 15.0752 17.5312 15.0752H18.7083L12.9896 22.6669C12.9375 22.7349 12.8715 22.7923 12.7917 22.8388C12.7153 22.8818 12.6215 22.9033 12.5104 22.9033H11.3021L17.0208 15.3224ZM19 21.0658C19 21.3524 18.9497 21.6156 18.849 21.8556C18.7483 22.092 18.6146 22.2962 18.4479 22.4681C18.2812 22.6364 18.0868 22.7672 17.8646 22.8603C17.6458 22.9534 17.4167 23 17.1771 23C16.9132 23 16.6701 22.9534 16.4479 22.8603C16.2292 22.7672 16.0382 22.6364 15.875 22.4681C15.7153 22.2962 15.5903 22.092 15.5 21.8556C15.4097 21.6156 15.3646 21.3524 15.3646 21.0658C15.3646 20.7685 15.4097 20.4999 15.5 20.2599C15.5903 20.0163 15.7153 19.8086 15.875 19.6367C16.0382 19.4647 16.2292 19.3322 16.4479 19.2391C16.6701 19.1424 16.9132 19.094 17.1771 19.094C17.441 19.094 17.684 19.1424 17.9062 19.2391C18.1319 19.3322 18.3247 19.4647 18.4844 19.6367C18.6476 19.8086 18.7743 20.0163 18.8646 20.2599C18.9549 20.4999 19 20.7685 19 21.0658ZM17.7604 21.0658C17.7604 20.8867 17.7448 20.7381 17.7135 20.6199C17.6858 20.4981 17.6458 20.4014 17.5938 20.3298C17.5417 20.2581 17.4792 20.208 17.4063 20.1793C17.3368 20.1507 17.2604 20.1363 17.1771 20.1363C17.0938 20.1363 17.0174 20.1507 16.9479 20.1793C16.8785 20.208 16.8194 20.2581 16.7708 20.3298C16.7222 20.4014 16.684 20.4981 16.6562 20.6199C16.6285 20.7381 16.6146 20.8867 16.6146 21.0658C16.6146 21.2377 16.6285 21.381 16.6562 21.4956C16.684 21.6103 16.7222 21.7016 16.7708 21.7696C16.8194 21.8377 16.8785 21.8861 16.9479 21.9147C17.0174 21.9434 17.0938 21.9577 17.1771 21.9577C17.2604 21.9577 17.3368 21.9434 17.4063 21.9147C17.4792 21.8861 17.5417 21.8377 17.5938 21.7696C17.6458 21.7016 17.6858 21.6103 17.7135 21.4956C17.7448 21.381 17.7604 21.2377 17.7604 21.0658Z"
      fill="#FF8787"
    />
  </svg>
`;
  function discountTemplate({ realDiscount: discount, type, claimedDiscount }, showClaimedDiscount) {
    if (discount === null || isNaN(discount))
      return null;
    discount = Math.trunc(discount * 100) / 100;
    claimedDiscount = Math.trunc(claimedDiscount * 100) / 100;
    const titles = /* @__PURE__ */ new Map([
      [
        "eu-minimum",
        "Reálná sleva se počítá podle EU směrnice jako aktuální cena po slevě ku minimální ceně, za kterou se zboží prodávalo v období 30 dní před slevovou akcí."
      ],
      [
        "common-price",
        "Počítá se jako aktuální cena ku nejčastější ceně, za kterou se zboží prodávalo za posledních 90 dnů."
      ]
    ]);
    const discountLabel = (x2) => {
      if (x2 === claimedDiscount) {
        return "Na slevě se shodneme";
      } else if (x2 > 0) {
        return "Podle nás sleva";
      } else if (x2 === 0) {
        return "Podle nás bez slevy";
      } else {
        return "Podle nás zdraženo";
      }
    };
    const discountClass = (x2) => ({
      "hs-real-discount": true,
      "hs-real-discount--neutral": x2 === 0,
      "hs-real-discount--negative": x2 < 0,
      "hs-real-discount--good": x2 === claimedDiscount
    });
    const title = titles.get(type);
    return $`
    <div class="hs-header__discount">
      <div class="${o3(discountClass(discount))}">
        <data value="${discount}">
          <span>
            ${discount < 0 ? "↑" : discount > 0 ? "↓" : "="}
            ${formatPercents(Math.abs(discount))}
          </span>
        </data>
        <a
          href="https://www.hlidacshopu.cz/metodika/#nova"
          target="_blank"
          rel="noopener"
          title="${title}"
        >
          ${discountLabel(discount)}
        </a>
      </div>
      ${when(showClaimedDiscount && discount !== claimedDiscount && claimedDiscount, () => claimedDiscountTemplate(claimedDiscount))}
    </div>
  `;
  }
  function originalPriceTemplate({ commonPrice, minPrice, type }) {
    return $`
    <div class="hs-original-price">
      ${type === "eu-minimum" ? "Minimální cena před akcí" : "Běžná cena"}
      <data value="${type === "eu-minimum" ? minPrice : commonPrice}"
        >${type === "eu-minimum" ? formatMoney(minPrice) : formatMoney(commonPrice)}</data
      >
    </div>
  `;
  }
  function imageTemplate({ imageUrl, currentPrice, name }, showImage) {
    if (!showImage)
      return;
    return $`
    <div class="hs-product-detail">
      <figure>
        <img src="${imageUrl || "/assets/img/no-image.png"}" alt="${name}" />
        <figcaption class="hs-actual-price">
          Prodejní cena
          <data value="${currentPrice}">${formatMoney(currentPrice)}</data>
        </figcaption>
      </figure>
    </div>
  `;
  }
  function footerTemplate() {
    return $`
    <div class="hs-footer">
      <div>
        Více informací na
        <a href="https://www.hlidacshopu.cz/">HlídačShopů.cz</a>
      </div>
      <div>
        Vytvořili <a href="https://www.apify.com/">Apify</a>,
        <a href="https://www.keboola.com/">Keboola</a>
        &amp; <a href="https://www.topmonks.com/">TopMonks</a>
      </div>
    </div>
  `;
  }
  function widgetTemplate(data, metadata, { showFooter, showLegend, showClaimedDiscount, showImage } = {
    showFooter: true,
    showLegend: true,
    showCurrentPrice: false,
    showClaimedDiscount: false,
    showImage: false
  }) {
    const params = new URLSearchParams({ url: location.href });
    const permalink = `https://www.hlidacshopu.cz/app/?${params}`;
    return $`
    <style>
      ${widgetStyles()}
    </style>
    <div id="hlidacShopu">
      <div class="hs-header">
        <div>
          <a
            class="hs-logo"
            href="${permalink}"
            title="trvalý odkaz na vývoj ceny"
          >
            ${logo}
          </a>
          ${originalPriceTemplate(metadata)}
        </div>
        ${discountTemplate(metadata, showClaimedDiscount)}
      </div>
      <div class="hs-body">
        ${imageTemplate(metadata, showImage)}
        ${chartTemplate("Uváděná původní cena", "Prodejní cena", showLegend)}
      </div>
      ${when(showFooter, () => footerTemplate())}
    </div>
  `;
  }
  function claimedDiscountTemplate(claimedDiscount) {
    return $`
    <div class="hs-claimed-discount">
      Sleva udávaná e-shopem <b>${formatPercents(claimedDiscount)}</b>
    </div>
  `;
  }

  // extension/helpers.mjs
  function cleanPriceText(priceText) {
    priceText = priceText.replace(/\s+/g, "");
    if (priceText.includes("cca"))
      priceText = priceText.split("cca")[1];
    const match3 = priceText.match(/\d+(:?[,.]\d+)?/);
    if (!match3)
      return null;
    return match3[0].replace(",", ".");
  }
  function cleanPrice(s4) {
    const el = typeof s4 === "string" ? document.querySelector(s4) : s4;
    if (!el)
      return null;
    let priceText = el.textContent;
    return cleanPriceText(priceText);
  }
  function isUnitPrice(s4) {
    const el = typeof s4 === "string" ? document.querySelector(s4) : s4;
    if (!el)
      return null;
    return el.textContent.includes("/kg");
  }
  function cleanUnitPrice(s4, quantity) {
    const el = typeof s4 === "string" ? document.querySelector(s4) : s4;
    if (!el)
      return null;
    let priceText = el.textContent;
    const unitPrice = cleanUnitPriceText(priceText);
    return quantity * (unitPrice / 1e3).toFixed(2);
  }
  function cleanUnitPriceText(priceText) {
    priceText = priceText.replace(/\s+/g, "");
    if (priceText.includes("/kg"))
      priceText = priceText.split("/kg")[0];
    const match3 = priceText.match(/\d+(:?[,.]\d+)?/);
    if (!match3)
      return null;
    return match3[0].replace(",", ".");
  }
  var shops2 = /* @__PURE__ */ new Map();
  function registerShop(shop, ...names2) {
    for (let name of names2) {
      shops2.set(name, shop);
    }
  }
  function getShop(url) {
    return shops2.get(shopName(url));
  }
  function getItemIdFromUrl(url) {
    const shop = shops.get(shopName(url));
    return shop.parse(url).itemId;
  }

  // extension/shops/shop.mjs
  var Shop = class {
    async scrape() {
      throw new Error("Method not implemented");
    }
    get injectionPoint() {
      throw new Error("Property not implemented");
    }
    inject(renderMarkup) {
      const [position, selector, extraStyles] = this.injectionPoint;
      const elem = document.querySelector(selector);
      if (!elem)
        throw new Error("Element to add chart not found");
      elem.insertAdjacentElement(position, renderMarkup(extraStyles));
      return elem;
    }
    async scheduleRendering({ render, cleanup, fetchData: fetchData2 }) {
      const info = await this.scrape();
      if (!info)
        return;
      const data = await fetchData2(info);
      if (!data)
        return;
      render(false, data);
    }
  };
  var StatefulShop = class extends Shop {
    get detailSelector() {
      throw new Error("Property not implemented");
    }
    get observerTarget() {
      return document.body;
    }
    shouldRender(mutations) {
      throw new Error("Method not implemented");
    }
    shouldCleanup(mutations) {
      throw new Error("Method not implemented");
    }
    didMutate(mutations, prop, token) {
      return mutations.find((x2) => Array.from(x2[prop]).find((y2) => {
        var _a;
        return (_a = y2.classList) == null ? void 0 : _a.contains(token);
      }));
    }
    async scheduleRendering({ render, cleanup, fetchData: fetchData2 }) {
      new MutationObserver(async (mutations) => {
        if (this.shouldRender(mutations)) {
          const info2 = await this.scrape();
          if (!info2)
            return;
          const data2 = await fetchData2(info2);
          if (!data2)
            return;
          render(false, data2);
        }
        if (this.shouldCleanup(mutations))
          cleanup();
      }).observe(this.observerTarget, {
        subtree: true,
        childList: true
      });
      const elem = document.querySelector(this.detailSelector);
      if (!elem)
        return;
      const info = await this.scrape();
      if (!info)
        return;
      const data = await fetchData2(info);
      if (!data)
        return;
      render(false, data);
    }
  };

  // extension/shops/aaaauto.mjs
  var AAAAuto = class extends Shop {
    async scrape() {
      const url = new URL(location.href);
      const itemId = url.searchParams.get("id");
      if (!itemId)
        return false;
      const imageUrl = document.querySelector("meta[name='og:image']").content;
      const engTabCard = document.querySelector("#tab-card");
      if (engTabCard) {
        const title2 = engTabCard.querySelector("h1").textContent;
        const priceRows = engTabCard.querySelectorAll("#priceTable .priceRow");
        let currentPrice2;
        if (priceRows.length === 2) {
          currentPrice2 = cleanPrice(engTabCard.querySelector("#priceTable .carPrice span"));
        } else {
          currentPrice2 = cleanPrice(engTabCard.querySelector("#priceTable .priceRow:last-child span"));
        }
        const originalPrice2 = null;
        return { itemId, title: title2, currentPrice: currentPrice2, originalPrice: originalPrice2, imageUrl };
      }
      const title = document.querySelector("#carCardHead h1").innerText;
      const price = document.querySelectorAll(`
      .sidebar ul.infoBoxNav li:not([style]):not([class]),
      .sidebar ul.infoBoxNav .fixedBarScrollHide,
      .sidebar ul.infoBoxNav .infoBoxNavTitle
    `);
      let originalPrice = null;
      let currentPrice = null;
      for (const p2 of price) {
        if (p2.textContent.includes("Cena")) {
          let strikePrice = p2.querySelector("span.notranslate s");
          if (strikePrice) {
            strikePrice = p2.querySelector("span.notranslate");
            originalPrice = cleanPriceText(strikePrice.childNodes[0].textContent);
            currentPrice = cleanPriceText(strikePrice.childNodes[1].textContent);
          } else {
            currentPrice = cleanPriceText(p2.textContent);
          }
        }
      }
      console.log(originalPrice);
      console.log(`currentPrice ${currentPrice}`);
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
    inject(renderMarkup) {
      let elem = document.querySelector("#testdrive-button");
      if (elem) {
        const markup2 = renderMarkup();
        elem.insertAdjacentElement("afterend", markup2);
        return elem;
      }
      elem = document.querySelector("#carButtons .testdrive-bonus");
      if (!elem)
        throw new Error("Element to add chart not found");
      const table = document.querySelector("#carButtons table");
      table.style.position = "relative";
      const markup = renderMarkup();
      elem.insertAdjacentElement("afterend", markup);
      return elem;
    }
  };
  registerShop(new AAAAuto(), "aaaauto", "aaaauto_sk");

  // extension/shops/alza.mjs
  function matchGroup(str, regex, groupN) {
    const match3 = str.match(regex);
    if (!match3) {
      return null;
    }
    return match3[groupN];
  }
  function getDetailInfo() {
    const elem = document.querySelector("#prices");
    if (!elem)
      return;
    const itemId = document.querySelector(".shoppingListsAdd").getAttribute("data-id");
    const title = document.querySelector('h1[itemprop="name"]').innerText.trim();
    const currentPrice = cleanPrice(".pricenormal .price_withVat") || cleanPrice(`
        #prices .bigPrice,
        .pricenormal .c2,
        .priceactionnormal .c2
      `);
    const originalPrice = cleanPrice(`
        #prices .price_compare,
        .pricenormal .pricecatalog,
        .comparePrice .crossPrice,
        .priceCompare .c2,
        .pricecatalog1 .c2
      `);
    const imageUrl = document.querySelector("#imgMain").dataset["src"];
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
  function getDailySlasherInfo() {
    const elem = document.querySelector("#dailySlasher");
    if (!elem)
      return;
    const itemId = matchGroup(elem.querySelector("a.name").href, /dq=(\d+)/, 1);
    const url = document.querySelector("#dailySlasher a.name").href;
    const currentPrice = cleanPrice(".blPrice .price");
    const originalPrice = cleanPrice(".blPrice .cprice");
    return { itemId, title: null, url, currentPrice, originalPrice };
  }
  function getMobileDetailInfo() {
    const elem = document.querySelector("#detailPage");
    if (!elem)
      return;
    const itemId = location.href.match(/d(\d+)\.htm$/).pop();
    const title = elem.querySelector("h1").innerText.trim();
    const currentPrice = cleanPrice(".price .normal");
    const originalPrice = cleanPrice(".price .compare");
    return { itemId, title, currentPrice, originalPrice };
  }
  function getArchiveInfo() {
    const elem = document.querySelector("#detailItem.archive");
    if (!elem)
      return;
    const itemId = document.querySelector(".surveyInfoForm").getAttribute("data-id");
    const title = document.querySelector(".breadcrumbs a.last").innerText.trim();
    const currentPrice = null;
    const originalPrice = null;
    return { itemId, title, currentPrice, originalPrice };
  }
  var Alza = class extends Shop {
    async scrape() {
      return getDetailInfo() || getMobileDetailInfo() || getDailySlasherInfo() || getArchiveInfo();
    }
    isDetailPage() {
      this.element = document.querySelector("#detailText .buy-buttons");
      return Boolean(this.element);
    }
    injectOnDetailPage(renderMarkup) {
      this.element.insertAdjacentElement("beforebegin", renderMarkup({
        "order": "0",
        "margin": "0",
        "padding": "4px 0 8px",
        "background-color": "#fff"
      }));
    }
    isMobileDetailPage() {
      this.element = document.querySelector(".main-btn-block");
      return Boolean(this.element);
    }
    injectOnMobileDetailPage(renderMarkup) {
      this.element.insertAdjacentElement("afterend", renderMarkup());
    }
    isDailySlasherPage() {
      this.element = document.querySelector(`#dailySlasher .running,
      #dailySlasher .cStart`);
      return Boolean(this.element);
    }
    injectOnDailySlasherPage(renderMarkup) {
      const c1w = document.querySelector("#dailySlasher .c1").offsetWidth;
      this.element.insertAdjacentElement("afterend", renderMarkup({ width: `${c1w - 80}px` }));
    }
    isArchive() {
      this.element = document.getElementById("blockArchiveMoreInfoButtons");
      return Boolean(this.element);
    }
    injectOnArchive(renderMarkup) {
      this.element.insertAdjacentElement("afterend", renderMarkup());
    }
    inject(renderMarkup) {
      if (this.isDetailPage()) {
        return this.injectOnDetailPage(renderMarkup);
      }
      if (this.isMobileDetailPage()) {
        return this.injectOnMobileDetailPage(renderMarkup);
      }
      if (this.isDailySlasherPage()) {
        return this.injectOnDailySlasherPage(renderMarkup);
      }
      if (this.isArchive()) {
        return this.injectOnArchive(renderMarkup);
      }
      throw new Error("Element to add chart not found");
    }
  };
  registerShop(new Alza(), "alza", "alza_sk");

  // extension/shops/benu.mjs
  var Benu = class extends Shop {
    get injectionPoint() {
      return ["afterend", ".buy-box"];
    }
    async scrape() {
      const richSnippet = JSON.parse(document.querySelector("#snippet-productRichSnippet-richSnippet").innerText);
      const title = richSnippet.name || document.querySelector(".product-title-rating .title").innerText;
      const itemId = richSnippet.identifier;
      const currentPrice = cleanPrice(".buy strong.buy-box__big-price");
      const originalPrice = cleanPrice(".buy .buy-box__price-head del");
      const imageUrl = document.querySelector("meta[property='og:image']").content;
      return { title, itemId, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Benu(), "benu");

  // extension/shops/czc.mjs
  var CZC = class extends Shop {
    get injectionPoint() {
      return ["beforeend", ".pd-price-delivery"];
    }
    async scrape() {
      const elem = document.querySelector(".product-detail");
      if (!elem)
        return null;
      const itemId = elem.dataset.productCode.replace("a", "");
      const title = document.querySelector("h1").getAttribute("title");
      const currentPrice = cleanPrice(".pd-info .price .price-vatin");
      if (!currentPrice)
        return null;
      const originalPrice = cleanPrice(".pd-info .price-before .price-vatin");
      const imageUrl = document.querySelector("meta[itemprop=image]").content;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new CZC(), "czc");

  // extension/shops/datart.mjs
  var Datart = class extends Shop {
    async scrape() {
      const elem = document.querySelector(".product-detail");
      if (!elem)
        return;
      const itemIdTarget = elem.getElementsByClassName("btn btn-link btn-compare")[0].getAttribute("data-target-add");
      if (!itemIdTarget.length > 1)
        return;
      const searchParams = new URLSearchParams(itemIdTarget);
      const itemId = searchParams.get("id");
      const title = elem.querySelector("h1.product-detail-title").textContent.trim();
      const currentPrice = elem.getElementsByClassName("product-price")[0].getAttribute("data-price-value");
      const originalPrice = cleanPrice(".product-price .cut-price del");
      const imageUrl = elem.querySelector("#lightgallery > .product-gallery-main div.item").getAttribute("data-src");
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
    inject(renderMarkup) {
      const css = `
      @media screen and (max-width: 767px) {
        #product-detail-header-top-wrapper {
          height: 972px;
        }
        #hlidacShopu {
          margin-top: 566px !important;
        }
      }
    `;
      const elem = document.querySelector(".block-info > .justify-content-end");
      if (elem) {
        const markup = renderMarkup({ "margin-bottom": "0" });
        elem.insertAdjacentElement("afterend", markup);
        const style = document.createElement("style");
        style.textContent = css;
        elem.insertAdjacentElement("afterend", style);
        return elem;
      }
      const archiveElem = document.querySelector(".product-price");
      if (archiveElem) {
        const markup = renderMarkup({ "margin-bottom": "0" });
        archiveElem.insertAdjacentElement("afterend", markup);
        const style = document.createElement("style");
        style.textContent = css;
        archiveElem.insertAdjacentElement("afterend", style);
        return archiveElem;
      }
      throw new Error("Element to add chart not found");
    }
  };
  registerShop(new Datart(), "datart", "datart_sk");

  // extension/shops/dm.mjs
  var didRenderDetail = (mutations) => mutations.find((x2) => Array.from(x2.addedNodes).find((y2) => y2.localName === "div" && y2.dataset.dmid === "bottom-detail-page-reco-slider"));
  var didMutate = (mutations) => mutations.find((x2) => Array.from(x2.removedNodes).find((y2) => y2.id === "dm-view"));
  var Dm = class extends StatefulShop {
    get injectionPoint() {
      return [
        "afterend",
        "div[data-dmid='detail-page-base-price-and-availability-container']"
      ];
    }
    get detailSelector() {
      return "div[itemtype='http://schema.org/Product']";
    }
    shouldRender(mutations) {
      return didRenderDetail(mutations);
    }
    shouldCleanup(mutations) {
      return didMutate(mutations);
    }
    async scrape() {
      const elem = document.querySelector("div[itemtype='http://schema.org/Product']");
      if (!elem)
        return;
      const itemId = elem.querySelector("meta[itemprop='gtin13']").content.trim();
      const titleSource = elem.querySelectorAll("meta[itemprop='name']");
      const title = `${titleSource[1].content.trim()} ${titleSource[0].content.trim()}`;
      const currentPrice = elem.querySelector("meta[itemprop=price]").content.trim();
      const originalPriceSource = elem.querySelector("div[data-dmid='sellout-price-container']");
      const originalPrice = originalPriceSource ? cleanPriceText(originalPriceSource.textContent.trim()) : null;
      const imageUrl = elem.querySelector("link[itemprop='image']").href;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Dm(), "dm_cz", "mojadm_sk");

  // extension/shops/electroworld.mjs
  var didRenderDetail2 = (mutations) => mutations.find((x2) => Array.from(x2.addedNodes).find((y2) => y2.localName === "div" && y2.className === "row" && y2.nextElementSibling.id === "product-detail-actions" || y2.localName === "li" && typeof y2.classList !== "undefined" && y2.classList.contains("breadcrumb__item")));
  var Electroworld = class extends StatefulShop {
    get injectionPoint() {
      return ["beforeend", "#product-detail-actions"];
    }
    get detailSelector() {
      return "#product-detail-actions";
    }
    shouldRender(mutations) {
      return didRenderDetail2(mutations);
    }
    shouldCleanup(mutations) {
      return this.didMutate(mutations, "removedNodes", "client-only-placeholder");
    }
    async scrape() {
      const jsonld = document.querySelectorAll('script[type="application/ld+json"]')[0];
      if (!jsonld)
        return null;
      try {
        const data = JSON.parse(jsonld.innerText);
        if (data["@type"] !== "Product")
          return null;
        return {
          title: data.name,
          currentPrice: data.offers.price,
          originalPrice: cleanPrice(".product-top__prices span del"),
          imageUrl: data.image
        };
      } catch (e5) {
        console.error("Could not find product info", e5);
      }
    }
  };
  registerShop(new Electroworld(), "electroworld_cz");

  // extension/shops/eva.mjs
  var Eva = class extends Shop {
    get injectionPoint() {
      if (this.isMobileDetailPage()) {
        return ["beforebegin", ".zpanel-price-mobile div.pb-3"];
      } else {
        return ["beforebegin", ".zpanel-price div.pb-3"];
      }
    }
    async scrape() {
      const elem = document.querySelector(".main_content");
      if (!elem)
        return;
      const itemId = getItemIdFromUrl(window.location);
      const title = elem.querySelector("meta[itemprop=name]").content.trim();
      const currentPrice = cleanUnitPriceText(elem.querySelector("meta[itemprop=price]").content.trim());
      const originalPrice = null;
      const imageUrl = elem.querySelector("div.imabx > a > img").src;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
    isMobileDetailPage() {
      const elem = document.querySelector("div.zpanel-price-mobile");
      const style = window.getComputedStyle(elem);
      return style.display === "block";
    }
  };
  registerShop(new Eva(), "eva_cz");

  // extension/shops/globus.mjs
  var Globus = class extends StatefulShop {
    get injectionPoint() {
      return ["beforebegin", "#detail-tabs-content"];
    }
    get detailSelector() {
      return "#detail-container";
    }
    shouldRender(mutations) {
      return this.didMutate(mutations, "addedNodes", "modal-backdrop");
    }
    shouldCleanup(mutations) {
      return this.didMutate(mutations, "removedNodes", "modal-backdrop");
    }
    async scrape() {
      const elem = document.querySelector("#detail-container");
      if (!elem)
        return;
      const itemId = elem.getAttribute("data-stock-item-code");
      const title = document.querySelector("h1").textContent.trim();
      const currentPrice = cleanPrice(".detail-price-now");
      const originalPrice = cleanPrice(".product-discount strong");
      const imageUrl = document.querySelector(".detail-image img").src;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Globus(), "iglobus");

  // extension/shops/ikea.mjs
  var Ikea = class extends Shop {
    get injectionPoint() {
      return ["afterend", ".pip-product-availability"];
    }
    async scrape() {
      const elem = document.querySelector("#content .product-pip");
      if (!elem)
        return;
      const jsonld = document.querySelectorAll('script[type="application/ld+json"]')[1];
      if (jsonld) {
        try {
          const data = JSON.parse(jsonld.innerText);
          let originalPrice, currentPrice;
          if (data.offers["@type"] === "Offer") {
            originalPrice = null;
            currentPrice = data.offers.price;
          } else if (data.offers["@type"] === "AggregateOffer") {
            originalPrice = data.offers.highPrice;
            currentPrice = data.offers.lowPrice;
          }
          return {
            itemId: data.sku.replaceAll(".", ""),
            title: data.name,
            currentPrice,
            originalPrice,
            imageUrl: data.image[0]
          };
        } catch (e5) {
          console.error("Could not find product info", e5);
        }
      }
    }
  };
  registerShop(new Ikea(), "ikea_cz", "ikea_sk");

  // extension/shops/itesco.mjs
  var didRenderDetail3 = (mutations) => mutations.find((x2) => x2.target.classList.contains("main__content") && x2.addedNodes.length === 1 && x2.addedNodes[0].innerHTML.indexOf("product-details-page") > 0);
  var Tesco = class extends StatefulShop {
    get detailSelector() {
      return ".product-details-page";
    }
    shouldRender(mutations) {
      return didRenderDetail3(mutations);
    }
    shouldCleanup(mutations) {
      return this.didMutate(mutations, "removedNodes", "loading-spa");
    }
    async scrape() {
      const elem = document.querySelector(".product-details-page");
      if (!elem)
        return;
      const href = location.href;
      const match3 = href.match(/(\d+)$/);
      let itemId = null;
      if (match3 && match3[1]) {
        itemId = match3[1];
      }
      const title = document.querySelector("h1").textContent.trim();
      const currentPrice = cleanPrice(".price-per-sellable-unit .value");
      const imageUrl = document.querySelector(".product-image").src;
      return { itemId, title, currentPrice, imageUrl };
    }
    inject(renderMarkup) {
      let elem = document.querySelector(".product-controls__wrapper");
      if (!elem)
        throw new Error("Element to add chart not found");
      const styles = {
        width: "60%",
        float: "right",
        margin: "0 16px 16px"
      };
      const markup = renderMarkup(styles);
      elem.insertAdjacentElement("afterend", markup);
      const style = document.createElement("style");
      style.textContent = `
      @media screen and (max-width: 767px) {
        .product-details-tile .product-controls--wrapper .basket-feedback__wrapper {
          min-height: 0;
        }
        #hlidacShopu {
          margin-top: 0 !important;
          width: calc(100% - 32px) !important;
        }
      }
    `;
      elem.insertAdjacentElement("beforebegin", style);
      return elem;
    }
  };
  registerShop(new Tesco(), "itesco", "itesco_sk");

  // extension/shops/kasa.mjs
  var Kasa = class extends Shop {
    get injectionPoint() {
      return ["beforebegin", ".product-summary-tools"];
    }
    async scrape() {
      const elem = document.querySelector(".product-detail");
      if (!elem)
        return;
      const inputZbozi = document.querySelector('input[name="zbozi"]');
      const itemId = inputZbozi.getAttribute("value");
      const title = document.querySelector("h1").textContent.trim();
      const currentPrice = cleanPrice("#real_price");
      const originalPrice = cleanPrice(".before-price .text-strike");
      const imageUrl = document.querySelector(".large-img").src;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Kasa(), "kasa");

  // extension/shops/knihydobrovsky.mjs
  var Knihydobrovsky = class extends Shop {
    get injectionPoint() {
      return ["afterend", "#snippet--deliveryInfo .variants"];
    }
    async scrape() {
      const elem = document.querySelector(".box-product");
      if (!elem)
        return;
      const originalPrice = parseFloat(cleanPrice(elem.querySelector(".price .discount")));
      const jsonld = document.querySelectorAll('script[type="application/ld+json"]')[1];
      if (jsonld) {
        try {
          const data = JSON.parse(jsonld.innerText);
          return {
            itemId: data.sku,
            title: data.name,
            currentPrice: data.offers.price,
            originalPrice: isNaN(originalPrice) ? null : originalPrice + data.offers.price,
            imageUrl: data.image[0]
          };
        } catch (e5) {
          console.error("Could not find product info", e5);
        }
      }
    }
  };
  registerShop(new Knihydobrovsky(), "knihydobrovsky_cz");

  // extension/shops/kosik.mjs
  var didRenderDetail4 = (mutations) => mutations.find((x2) => Array.from(x2.addedNodes).find((y2) => typeof y2.classList !== "undefined" && y2.classList.contains("product-detail-modal") || y2.localName === "article" && y2.dataset.tid === "product-detail"));
  var Kosik = class extends StatefulShop {
    get injectionPoint() {
      return ["afterend", ".product-header-box"];
    }
    get detailSelector() {
      return "article[data-tid=product-detail]";
    }
    shouldRender(mutations) {
      return didRenderDetail4(mutations);
    }
    shouldCleanup(mutations) {
      return this.didMutate(mutations, "removedNodes", "product-detail-modal");
    }
    async scrape() {
      const elem = document.querySelector("article[data-tid=product-detail]");
      if (!elem)
        return;
      try {
        const data = {};
        data.itemId = elem.querySelector("[itemprop=productID]").getAttribute("content");
        data.title = elem.querySelector("[itemprop=name]").textContent;
        data.currentPrice = cleanPriceText(elem.querySelector("[itemprop=price]").textContent);
        data.originalPrice = cleanPrice(".product-header-box s");
        data.imageUrl = elem.querySelector("[itemprop=image] img").getAttribute("srcset").split(",").pop().trim().split(" ")[0];
        return data;
      } catch (e5) {
        console.error("Could not find product info", e5);
      }
    }
  };
  registerShop(new Kosik(), "kosik");

  // extension/shops/lekarna.mjs
  var Lekarna = class extends Shop {
    get injectionPoint() {
      return ["afterend", `[itemprop=offers]`];
    }
    async scrape() {
      var _a, _b, _c, _d;
      const elem = document.querySelector("[itemtype='https://schema.org/Product']");
      if (!elem)
        return null;
      const itemId = (_a = elem.querySelector("[itemprop=sku]")) == null ? void 0 : _a.textContent.trim();
      const title = (_b = elem.querySelector("[itemprop=name]")) == null ? void 0 : _b.textContent.trim();
      const currentPrice = (_c = elem.querySelector("[itemprop=price]")) == null ? void 0 : _c.getAttribute("content");
      const originalPrice = cleanPrice("[itemprop=offers] .line-through");
      const imageUrl = (_d = document.querySelector("[property='og:image']")) == null ? void 0 : _d.content;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Lekarna(), "lekarna");

  // extension/shops/mall.mjs
  var Mall = class extends Shop {
    constructor() {
      super();
      this.loaded = false;
      this.lastHref = null;
      this.firstLoad = true;
      this.state = null;
    }
    get injectionPoint() {
      return [
        "afterend",
        `.product-footer,
       .other-options-box,
       .detail-prices-wrapper,
       .info-box`
      ];
    }
    get waitForSelector() {
      return ".info-box";
    }
    async scrape() {
      var _a;
      const elem = document.querySelector(`.price-wrapper,
      .prices-wrapper,
      .price__wrap`);
      if (!elem)
        return null;
      const itemId = document.querySelector(`span[data-sel="catalog-number"],
        .additional-info__catalog-number span`).innerText.trim().replace("a", "");
      const title = document.querySelector("h1.detail__title").innerText.trim();
      const currentPrice = cleanPrice(`[itemprop=price],
       .price__wrap__box__final`);
      if (!currentPrice)
        return null;
      const originalPrice = cleanPrice(`.old-new-price .rrp-price,
       .old-price > del:nth-child(1),
        .price__wrap__box__old`);
      const imageUrl = (_a = document.querySelector(".gallery-magnifier__normal")) == null ? void 0 : _a.src;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
    async scheduleRendering({ render, cleanup, fetchData: fetchData2 }) {
      new MutationObserver(async () => {
        if (location.href !== this.lastHref) {
          this.loaded = false;
          this.lastHref = location.href;
        }
        if (this.loaded)
          return;
        const elem = document.querySelector(this.waitForSelector);
        if (!elem) {
          cleanup();
          this.loaded = false;
          this.firstLoad = true;
          return;
        }
        const info2 = await this.scrape();
        if (!info2)
          return;
        const serializedState = JSON.stringify(info2);
        if (serializedState === this.state)
          return;
        this.state = serializedState;
        const data2 = await fetchData2(info2);
        if (!data2)
          return;
        this.loaded = true;
        render(!this.firstLoad, data2);
        this.firstLoad = false;
      }).observe(document.body, {
        subtree: true,
        characterData: true
      });
      if (!document.querySelector(this.waitForSelector))
        return;
      const info = await this.scrape();
      if (!info)
        return;
      this.lastHref = location.href;
      this.state = JSON.stringify(info);
      const data = await fetchData2(info);
      if (!data)
        return;
      this.loaded = true;
      render(false, data);
      this.firstLoad = false;
    }
  };
  registerShop(new Mall(), "mall", "mall_sk");

  // extension/shops/megapixel.mjs
  var Megapixel = class extends Shop {
    get injectionPoint() {
      return ["beforebegin", "section.half-content-box"];
    }
    async scrape() {
      const elem = document.querySelector("div#snippet--price");
      if (!elem)
        return;
      const itemIdUrl = document.querySelector("p.sticky-bar-product__buttons > a").href;
      const url = new URL(itemIdUrl);
      const itemId = url.searchParams.get("produkt");
      const title = document.querySelector("h1").innerText.trim();
      const currentPrice = cleanPrice(".product-detail__price-vat");
      const originalPrice = cleanPrice(".product-detail__price del");
      const imageUrl = document.querySelector(".product-detail__main-img a").href;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Megapixel(), "megapixel_cz");

  // extension/shops/mironet.mjs
  var Mironet = class extends Shop {
    get injectionPoint() {
      return ["afterend", ".product_kosik_info"];
    }
    async scrape() {
      const elem = document.querySelector(".product_detail");
      if (!elem)
        return;
      const itemId = document.querySelector(".product_kosik_info input[name=Code]").value;
      const title = document.querySelector("h1").textContent.trim();
      const currentPrice = cleanPrice(".product_cena_box .product_dph");
      const originalPrice = cleanPrice(".fakcbox23 .product_dph span");
      const imageUrl = document.getElementById("DetailImg").src;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Mironet(), "mironet");

  // extension/shops/mountfield.mjs
  var Mountfield = class extends Shop {
    get injectionPoint() {
      return [
        "beforebegin",
        ".box-detail-info__links"
      ];
    }
    async scrape() {
      const elem = document.querySelector(".box-detail");
      if (!elem)
        return;
      const itemId = elem.querySelector("meta[itemprop=sku]").content.trim().toLowerCase();
      const title = elem.querySelector("h1.box-detail__heading").textContent.trim();
      const currentPrice = elem.querySelector("meta[itemprop=price]").content.trim();
      const originalPrice = cleanPrice(".box-detail-add__prices__item__text__price");
      const imageUrl = elem.querySelector("img[itemprop=image]").src;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Mountfield(), "mountfield", "mountfield_sk");

  // extension/shops/notino.mjs
  var Notino = class extends Shop {
    constructor() {
      super();
      this.masterId = null;
      this.lastHref = location.href;
    }
    get injectionPoint() {
      return ["beforebegin", "a[class^='styled__StyledAddToWishlist']"];
    }
    async scheduleRendering({ render, cleanup, fetchData: fetchData2 }) {
      const elem = document.getElementById("pd-price");
      if (!elem)
        return false;
      const info = await this.scrape();
      if (!info)
        return;
      const data = await fetchData2(info);
      if (!data)
        return;
      render(false, data);
      new MutationObserver(async () => {
        if (location.href === this.lastHref)
          return;
        this.lastHref = location.href;
        const info2 = await this.scrape();
        if (!info2)
          return;
        const data2 = await fetchData2(info2);
        if (!data2)
          return;
        render(true, data2);
      }).observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    getMasterId() {
      var _a;
      const apolloState = JSON.parse(document.getElementById("__APOLLO_STATE__").textContent);
      const [key] = Object.entries(apolloState.ROOT_QUERY).find(([k2]) => k2.startsWith("productDetailByMasterId"));
      const masterId = (_a = key.match(/masterId":"(\d+)/)) == null ? void 0 : _a[1];
      console.log(`Found master id ${masterId}`);
      return masterId;
    }
    async scrape() {
      const elem = document.getElementById("pdHeader");
      if (!elem)
        return;
      const title = document.querySelector("h1").textContent.trim();
      const currentPrice = cleanPrice("#pd-price");
      const originalPrice = cleanPrice("[class^='styled__DiscountWrapper'] span[content]");
      const imageUrl = document.querySelector("[class^='styled__ImgWrapper'] img").src;
      let itemId = (() => {
        const match3 = window.location.pathname.match(/\/p-(\d+)\//);
        return match3 ? match3[1] : null;
      })();
      if (!itemId) {
        itemId = this.masterId || this.getMasterId();
        this.masterId = itemId;
      }
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Notino(), "notino", "notino_sk");

  // extension/shops/obi.mjs
  var Obi = class extends Shop {
    get injectionPoint() {
      return ["afterend", "#AB_buttons"];
    }
    async scrape() {
      var _a;
      const elem = document.querySelector(".overview__description");
      if (!elem)
        return;
      const title = document.querySelector("h1.overview__heading").textContent.trim();
      const currentPrice = cleanPrice(".overview__price");
      const originalPrice = cleanPrice(".optional-hidden del");
      const imageUrl = document.querySelector(".ads-slider__link img").src;
      let itemId = (_a = window.location.pathname.match(/p\/(\d+)(#\/)?$/)) == null ? void 0 : _a[1];
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Obi(), "obi_cz", "obi_sk", "obi_pl", "obi_hu", "obi-italia_it", "obi_de", "obi_at", "obi_ru", "obi_ch");

  // extension/shops/okay.mjs
  var Okay = class extends Shop {
    get injectionPoint() {
      return ["afterend", ".product-form-container"];
    }
    async scrape() {
      const elem = document.querySelector("#template-product");
      if (!elem)
        return;
      const itemId = document.querySelector("div.product-gallery__main").attributes["data-product-id"].textContent;
      const originalPrice = cleanPrice("p.was-price  span.money");
      const currentPrice = cleanPrice("p.current_price span.money");
      const title = elem.querySelector("h1").innerText.trim();
      const imageUrl = document.querySelector(".product-gallery__link").href;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Okay(), "okay_cz", "okay_sk");

  // extension/shops/pilulka.mjs
  var Pilulka = class extends Shop {
    get injectionPoint() {
      return ["beforeend", ".product-detail__reduced h1+div+div"];
    }
    async scrape() {
      const title = document.querySelector(".product-detail__header").innerText;
      const priceContainer = document.querySelector("div.js-product-prev");
      const itemId = priceContainer.attributes["data-product-id"].textContent;
      const currentPrice = cleanPrice(`.js-product-price-${itemId}`);
      const originalPrice = cleanPrice(document.querySelector(`.js-product-price-${itemId}`).nextElementSibling);
      const imageUrl = document.querySelector(".product-detail__images--img").dataset["src"];
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Pilulka(), "pilulka", "pilulka_sk");

  // extension/shops/prozdravi.mjs
  var Prozdravi = class extends Shop {
    get injectionPoint() {
      return ["afterend", "#product-prices-block"];
    }
    async scrape() {
      const data = JSON.parse(document.querySelector("#gtm-data input").value);
      const masterData = document.querySelector(".product-master-data");
      const title = data.name;
      const itemId = data.id;
      const { value: originalPrice } = JSON.parse(masterData.querySelector("input[name=backupPrice]").value);
      const { value: currentPrice } = JSON.parse(masterData.querySelector("input[name=price]").value);
      const imageUrl = document.querySelector("meta[property='og:image']").content;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Prozdravi(), "prozdravi");

  // extension/shops/rohlik.mjs
  var didRenderDetail5 = (mutations) => mutations.find((x2) => Array.from(x2.addedNodes).find((y2) => y2.id === "productDetail"));
  var Rohlik = class extends StatefulShop {
    get injectionPoint() {
      return [
        "beforeend",
        '#productDetail div[data-test="product-detail-upper-section"] > div:last-child'
      ];
    }
    get detailSelector() {
      return "#productDetail";
    }
    get observerTarget() {
      return document.querySelector("#__next");
    }
    shouldRender(mutations) {
      return didRenderDetail5(mutations);
    }
    shouldCleanup(mutations) {
      return this.didMutate(mutations, "removedNodes", "product_detail_modal");
    }
    async scrape() {
      const elem = document.querySelector("#productDetail");
      if (!elem)
        return null;
      const originalPrice = isUnitPrice("#productDetail del") ? cleanUnitPrice("#productDetail del", cleanPrice("#productDetail .detailQuantity")) : cleanPrice("#productDetail del");
      const jsonld = elem.querySelector('script[type="application/ld+json"]');
      if (jsonld) {
        try {
          const data = JSON.parse(jsonld.innerText);
          return {
            itemId: data.sku,
            title: data.name,
            currentPrice: data.offers.price.toFixed(2),
            imageUrl: `https://www.rohlik.cz/cdn-cgi/image/f=auto,w=500,h=500/https://cdn.rohlik.cz${data.image[0]}`,
            originalPrice
          };
        } catch (e5) {
          console.error("Could not find product info", e5);
        }
      }
      const itemId = document.querySelector("#productDetail button[data-product-id]").dataset.productId;
      const title = document.title.split("-");
      const t4 = title[0].trim();
      const currentPrice = cleanPrice(`#productDetail .actionPrice,
       #productDetail .currentPrice`);
      const imageUrl = document.querySelector("[data-gtm-item=product-image] img").src;
      return { itemId, title: t4, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Rohlik(), "rohlik");

  // extension/shops/sleky.mjs
  var SLeky = class extends Shop {
    get injectionPoint() {
      return ["beforebegin", ".short-description"];
    }
    async scrape() {
      const title = document.querySelector("h1[itemprop='name']").innerText;
      const form = document.querySelector(".orderbox form");
      const itemId = form.dataset.productId;
      const currentPrice = cleanPrice(form.querySelector("strong.fullprice"));
      const originalPrice = cleanPrice(form.querySelector("dl>dt+dd"));
      const imageUrl = document.querySelector("img[itemprop=image],.content img").src;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new SLeky(), "sleky");

  // extension/shops/tetadrogerie.mjs
  var Tetadrogerie = class extends Shop {
    inject(renderMarkup) {
      let elem = document.querySelector(".sx-detail-footer");
      if (!elem)
        throw new Error("Element to add chart not found");
      const styles = {
        margin: "0px, 0px",
        padding: "16px 0px"
      };
      const markup = renderMarkup(styles);
      elem.insertAdjacentElement("beforebegin", markup);
      return elem;
    }
    async scrape() {
      const elem = document.querySelector("#product-overview");
      if (!elem)
        return;
      const product = elem.querySelector(".j-product");
      const itemId = product.attributes["data-skuid"].textContent;
      const title = product.querySelector(".sx-detail-product-name").innerText;
      const actionPrice = cleanPrice(".sx-detail-price-action");
      const initialPrice = cleanPrice(".sx-detail-price-initial");
      const originalPrice = actionPrice ? initialPrice / 100 : null;
      const currentPrice = actionPrice ? actionPrice / 100 : initialPrice / 100;
      const cssDesktopImageUrl = document.querySelector(".zoomWindowContainer .zoomWindow");
      const cssMobileImageUrl = document.querySelector(".j-gallery-image");
      const finalImageUrl = cssDesktopImageUrl ? cssDesktopImageUrl.style.backgroundImage : cssMobileImageUrl.style.backgroundImage;
      const imageUrl = finalImageUrl.substring(4, finalImageUrl.length - 1);
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new Tetadrogerie(), "tetadrogerie_cz");

  // extension/shops/tsbohemia.mjs
  var TSBohemia = class extends Shop {
    get injectionPoint() {
      return ["beforebegin", ".product-tools"];
    }
    async scrape() {
      const elem = document.querySelector("#stoitem_detail");
      if (!elem)
        return;
      const itemId = document.querySelector(".sti_detail_head").dataset.stiid;
      const title = document.querySelector("h1").textContent.trim();
      const currentPrice = document.querySelector(".price .wvat").textContent.split("Kč")[0].replace(",-", "").replace(/\s/g, "");
      const originalPrice = cleanPrice(".price .mc");
      const imageUrl = document.querySelector("#sti_bigimg img").src;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
  };
  registerShop(new TSBohemia(), "tsbohemia");

  // extension/shops/lidl.mjs
  var Lidl = class extends Shop {
    get injectionPoint() {
      if (this.isMobileDetailPage()) {
        return ["beforebegin", ".buybox__bottom"];
      } else {
        return ["afterend", ".keyfacts"];
      }
    }
    async scrape() {
      const elem = document.querySelector(".buybox");
      if (!elem)
        return;
      const itemId = document.querySelector(".buybox__erp-number").textContent;
      const title = document.querySelector(".keyfacts__title").textContent.trim();
      const currentPrice = cleanPrice(".m-price__price");
      const originalPrice = cleanPrice(".m-price__rrp");
      const imageUrl = document.querySelector(".gallery-image__img").src;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
    isMobileDetailPage() {
      const elem = document.querySelector("article.detail");
      const style = window.getComputedStyle(elem);
      return style.margin === "8px 0px 0px";
    }
  };
  registerShop(new Lidl(), "lidl_cz");

  // extension/shops/tchibo.mjs
  var Tchibo = class extends Shop {
    async scrape() {
      var _a, _b;
      const elem = document.querySelector(".c-tp-simplebutton--order");
      if (!elem)
        return;
      const itemUrl = document.location.href;
      const itemId = (_a = itemUrl.match(/\/p(\d+)/)) == null ? void 0 : _a[1];
      const title = document.querySelector("h1").textContent.trim();
      const currentPrice = cleanPrice(".c-tp-price-currentprice");
      const originalPrice = cleanPrice(".c-tp-price-oldprice .c-tp-price-output");
      const imageUrl = (_b = document.querySelector(".m-tp-productimagegallery-preview-wrapper > a > img")) == null ? void 0 : _b.src;
      return { itemId, title, currentPrice, originalPrice, imageUrl };
    }
    inject(renderMarkup) {
      let elem = document.querySelector(".m-tp-base-column--leftaligned .c-tp-simplebutton--order");
      console.log(elem);
      if (elem) {
        const markup2 = renderMarkup();
        elem.insertAdjacentElement("afterend", markup2);
        return elem;
      }
      elem = document.querySelector("#carButtons .testdrive-bonus");
      if (!elem)
        throw new Error("Element to add chart not found");
      const table = document.querySelector("#carButtons table");
      table.style.position = "relative";
      const markup = renderMarkup();
      elem.insertAdjacentElement("afterend", markup);
      return elem;
    }
  };
  registerShop(new Tchibo(), "tchibo_cz", "tchibo_sk");

  // extension/shops/hornbach.mjs
  var Hornbach = class extends Shop {
    get injectionPoint() {
      return ["afterend", "#product-information"];
    }
    async scrape() {
      var _a, _b, _c;
      const elems = document.querySelectorAll('script[type="application/ld+json"]');
      if (!elems)
        return;
      const itemUrl = document.location.href;
      const itemId = (_a = itemUrl.match(/(\d+)\/artik[e]?l.html/)) == null ? void 0 : _a[1];
      const scripts = document.querySelectorAll("script");
      for (const script of scripts) {
        if (script.textContent.includes("window.__ARTICLE_DETAIL_STATE__")) {
          const start = script.textContent.indexOf("window.__ARTICLE_DETAIL_STATE__ = ") + "window.__ARTICLE_DETAIL_STATE__ = ".length;
          const end = script.textContent.indexOf("window.pushTrackingInfo");
          const rawJson = script.textContent.substring(start, end).trim();
          const { article } = JSON.parse(rawJson);
          return { itemId, title: article.title, currentPrice: (_b = article.displayPrice) == null ? void 0 : _b.price, originalPrice: (_c = article.guidingPrice) == null ? void 0 : _c.price, imageUrl: article.metaImage.url };
        }
      }
    }
  };
  registerShop(new Hornbach(), "hornbach", "hornbach_sk");

  // extension/content.mjs
  function toCssString(obj) {
    if (!obj)
      return "";
    return Object.entries(obj).map(([key, value]) => `${key}:${value};`).join("");
  }
  function getVersion() {
    return (chrome || browser).runtime.getManifest().version;
  }
  function fetchData(url, info) {
    const searchString = new URLSearchParams(Object.entries(info).filter(([, val]) => Boolean(val)));
    searchString.append("url", url);
    searchString.append("ext", getVersion());
    return fetch(`https://api2.hlidacshopu.cz/detail?${searchString}`).then((resp) => {
      if (resp.status === 404) {
        return resp.json();
      }
      if (!resp.ok) {
        throw new Error("HTTP error, status = " + resp.status);
      }
      return resp.json();
    });
  }
  var renderRoot = document.createElement("div");
  renderRoot.dataset["hs"] = getVersion();
  var shadow = renderRoot.attachShadow({ mode: "closed" });
  var chart;
  function renderHTML(repaint, shop, data, metadata) {
    if (!shop.loaded || !repaint) {
      shop.inject((styles) => {
        renderRoot.setAttribute("style", toCssString(Object.assign({ "margin": "16px 0" }, styles)));
        return renderRoot;
      });
    }
    if (repaint && chart)
      chart.destroy();
    x(widgetTemplate(data, metadata), shadow);
    const ctx = getCanvasContext(shadow);
    chart = createChart(ctx, data.currentPrice, data.originalPrice, "Uváděná původní cena", "Prodejní cena");
  }
  function injectFont() {
    x($`<link rel="stylesheet" href="https://use.typekit.net/nxm2nnh.css" />`, document.head);
  }
  function handleDetail(shop) {
    return shop.scheduleRendering({
      async fetchData(info) {
        var _a, _b;
        const url = (_a = info.url) != null ? _a : location.href;
        const res = await fetchData(url, info);
        if (res.error || ((_b = res.metadata) == null ? void 0 : _b.error)) {
          console.error("Hlídačshopů.cz - Error fetching data: ", res.error || res.metadata.error);
          return null;
        }
        if (!res.data || res.data.length === 0) {
          console.error("Hlídačshopů.cz - No data found:", res);
          return null;
        }
        return { url, info, metadata: res.metadata, dataset: res.data };
      },
      render(repaint, { url, info, metadata, dataset }) {
        try {
          const { itemId } = info;
          console.log(`Hlídačshopů.cz - Chart loaded for ItemID: ${itemId}`);
          console.log("Hlídačshopů.cz - Render:", { info, metadata, dataset });
          renderHTML(repaint, shop, dataset, metadata);
          const params = new URLSearchParams({ url, itemId, debug: 1 });
          console.log(`Hlídačshopů.cz - Debug URL: https://www.hlidacshopu.cz/app/?${params}`);
          return true;
        } catch (e5) {
          console.error(e5);
          return false;
        }
      },
      cleanup() {
        renderRoot.remove();
        if (chart)
          chart.destroy();
        shop.loaded = false;
      }
    });
  }
  async function main() {
    console.log(`Hlídačshopů.cz - Version: %c${getVersion()}`, "font-weight: 700");
    const shop = getShop(location.href);
    if (!shop) {
      console.log("Hlídačshopů.cz - No shop found");
      console.groupEnd();
      return;
    }
    injectFont();
    await handleDetail(shop);
  }
  main().catch((err) => console.error(err));
})();
/*!
 * @kurkle/color v0.1.9
 * https://github.com/kurkle/color#readme
 * (c) 2020 Jukka Kurkela
 * Released under the MIT License
 */
/*!
 * Chart.js v3.7.1
 * https://www.chartjs.org
 * (c) 2022 Chart.js Contributors
 * Released under the MIT License
 */
/*!
 * chartjs-adapter-date-fns v2.0.0
 * https://www.chartjs.org
 * (c) 2021 chartjs-adapter-date-fns Contributors
 * Released under the MIT license
 */
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
