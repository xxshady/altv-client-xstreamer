var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp(target, key, result);
  return result;
};
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// node_modules/altv-xlogger/dist/create.js
import alt2 from "alt-shared";

// node_modules/altv-xlogger/dist/class.js
import alt from "alt-shared";

// node_modules/altv-xlogger/dist/decorators.js
var checkEnabled = (logType) => {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function(...args) {
      if (!this.enabled)
        return;
      if (logType < this.logLevel)
        return;
      originalMethod.apply(this, args);
    };
  };
};

// node_modules/altv-xlogger/dist/enums.js
var LogLevel;
(function(LogLevel2) {
  LogLevel2[LogLevel2["Info"] = 0] = "Info";
  LogLevel2[LogLevel2["Warn"] = 1] = "Warn";
  LogLevel2[LogLevel2["Error"] = 2] = "Error";
})(LogLevel || (LogLevel = {}));

// node_modules/altv-xlogger/dist/utils/util-format.js
var formatRegExp = /%[sdj%]/g;
var format = function(f) {
  if (!isString(f)) {
    const objects = [];
    for (let i2 = 0; i2 < arguments.length; i2++) {
      objects.push(inspect(arguments[i2]));
    }
    return objects.join(" ");
  }
  let i = 1;
  const args = arguments;
  const len = args.length;
  let str = String(f).replace(formatRegExp, function(x) {
    if (x === "%%")
      return "%";
    if (i >= len)
      return x;
    switch (x) {
      case "%s":
        return String(args[i++]);
      case "%d":
        return Number(args[i++]);
      case "%j":
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return "[Circular]";
        }
      default:
        return x;
    }
  });
  for (let x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += " " + x;
    } else {
      str += " " + inspect(x);
    }
  }
  return str;
};
function isArray(ar) {
  return Array.isArray(ar);
}
function isBoolean(arg) {
  return typeof arg === "boolean";
}
function isNull(arg) {
  return arg === null;
}
function isNumber(arg) {
  return typeof arg === "number";
}
function isString(arg) {
  return typeof arg === "string";
}
function isUndefined(arg) {
  return arg === void 0;
}
function isRegExp(re) {
  return isObject(re) && objectToString(re) === "[object RegExp]";
}
function isObject(arg) {
  return typeof arg === "object" && arg !== null;
}
function isDate(d) {
  return isObject(d) && objectToString(d) === "[object Date]";
}
function isError(e) {
  return isObject(e) && (objectToString(e) === "[object Error]" || e instanceof Error);
}
function isFunction(arg) {
  return typeof arg === "function";
}
function inspect(obj, opts) {
  const ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  if (arguments.length >= 3)
    ctx.depth = arguments[2];
  if (arguments.length >= 4)
    ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    ctx.showHidden = opts;
  } else if (opts) {
    _extend(ctx, opts);
  }
  if (isUndefined(ctx.showHidden))
    ctx.showHidden = false;
  if (isUndefined(ctx.depth))
    ctx.depth = 2;
  if (isUndefined(ctx.colors))
    ctx.colors = false;
  if (isUndefined(ctx.customInspect))
    ctx.customInspect = true;
  if (ctx.colors)
    ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
function stylizeNoColor(str, styleType) {
  return str;
}
function formatValue(ctx, value, recurseTimes) {
  if (ctx.customInspect && value && isFunction(value.inspect) && value.inspect !== inspect && !(value.constructor && value.constructor.prototype === value)) {
    let ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }
  const primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }
  let keys = Object.keys(value);
  const visibleKeys = arrayToHash(keys);
  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }
  if (isError(value) && (keys.indexOf("message") >= 0 || keys.indexOf("description") >= 0)) {
    return formatError(value);
  }
  if (keys.length === 0) {
    if (isFunction(value)) {
      const name = value.name ? ": " + value.name : "";
      return ctx.stylize("[Function" + name + "]", "special");
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), "date");
    }
    if (isError(value)) {
      return formatError(value);
    }
  }
  let base = "", array = false, braces = ["{", "}"];
  if (isArray(value)) {
    array = true;
    braces = ["[", "]"];
  }
  if (isFunction(value)) {
    const n = value.name ? ": " + value.name : "";
    base = " [Function" + n + "]";
  }
  if (isRegExp(value)) {
    base = " " + RegExp.prototype.toString.call(value);
  }
  if (isDate(value)) {
    base = " " + Date.prototype.toUTCString.call(value);
  }
  if (isError(value)) {
    base = " " + formatError(value);
  }
  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }
  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
    } else {
      return ctx.stylize("[Object]", "special");
    }
  }
  ctx.seen.push(value);
  let output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }
  ctx.seen.pop();
  return reduceToSingleString(output, base, braces);
}
function reduceToSingleString(output, base, braces) {
  let numLinesEst = 0;
  const length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf("\n") >= 0)
      numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, "").length + 1;
  }, 0);
  if (length > 60) {
    return braces[0] + (base === "" ? "" : base + "\n ") + " " + output.join(",\n  ") + " " + braces[1];
  }
  return braces[0] + base + " " + output.join(", ") + " " + braces[1];
}
function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize("undefined", "undefined");
  if (isString(value)) {
    const simple = "'" + JSON.stringify(value).replace(/^"|"$/g, "").replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
    return ctx.stylize(simple, "string");
  }
  if (isNumber(value))
    return ctx.stylize("" + value, "number");
  if (isBoolean(value))
    return ctx.stylize("" + value, "boolean");
  if (isNull(value))
    return ctx.stylize("null", "null");
}
function formatError(value) {
  return "[" + Error.prototype.toString.call(value) + "]";
}
function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  const output = [];
  for (let i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
    } else {
      output.push("");
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
    }
  });
  return output;
}
function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  let name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize("[Getter/Setter]", "special");
    } else {
      str = ctx.stylize("[Getter]", "special");
    }
  } else {
    if (desc.set) {
      str = ctx.stylize("[Setter]", "special");
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = "[" + key + "]";
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf("\n") > -1) {
        if (array) {
          str = str.split("\n").map(function(line) {
            return "  " + line;
          }).join("\n").substr(2);
        } else {
          str = "\n" + str.split("\n").map(function(line) {
            return "   " + line;
          }).join("\n");
        }
      }
    } else {
      str = ctx.stylize("[Circular]", "special");
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify("" + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, "name");
    } else {
      name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, "string");
    }
  }
  return name + ": " + str;
}
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
function arrayToHash(array) {
  const hash = {};
  array.forEach(function(val, idx) {
    hash[val] = true;
  });
  return hash;
}
function _extend(origin, add) {
  if (!add || !isObject(add))
    return origin;
  const keys = Object.keys(add);
  let i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
}
function objectToString(o) {
  return Object.prototype.toString.call(o);
}
function stylizeWithColor(str, styleType) {
  const style = inspect.styles[styleType];
  if (style) {
    return "\x1B[" + inspect.colors[style][0] + "m" + str + "\x1B[" + inspect.colors[style][1] + "m";
  } else {
    return str;
  }
}

// node_modules/altv-xlogger/dist/class.js
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
    r = Reflect.decorate(decorators, target, key, desc);
  else
    for (var i = decorators.length - 1; i >= 0; i--)
      if (d = decorators[i])
        r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = function(k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
    return Reflect.metadata(k, v);
};
var _Logger = class {
  name;
  enabled = true;
  logLevel = LogLevel.Info;
  moreInfo;
  constructor(name, options) {
    this.name = name;
    if (options)
      this.applyOptions(options);
    this.log = this.log.bind(this);
    this.warn = this.warn.bind(this);
    this.error = this.error.bind(this);
    this.moreInfo = alt.isServer ? this.moreInfoServer.bind(this) : this.moreInfoClient.bind(this);
  }
  applyOptions(options) {
    const { logLevel = this.logLevel, enabled = this.enabled } = options;
    this.logLevel = logLevel;
    this.enabled = enabled;
  }
  log(...args) {
    alt.log(`${_Logger.startLogColor}[${this.name}]~w~`, ...args);
  }
  warn(...args) {
    alt.logWarning(`[${this.name}]`, ...args);
  }
  error(...args) {
    if (args[0] instanceof Error) {
      args[0] = args[0].stack;
    }
    alt.logError(`[${this.name}]`, ...args);
  }
  moreInfoServer(...args) {
    const date = new Date();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    console.log(`[${formatDateUnit(hour)}:${formatDateUnit(minute)}:${formatDateUnit(second)}]`, `${_Logger.nodeCyanColor}[${this.name}]${_Logger.nodeWhiteColor}`, ...args);
    function formatDateUnit(unit) {
      return unit >= 10 ? unit : `0${unit}`;
    }
  }
  moreInfoClient(...args) {
    alt.log(`${_Logger.startLogColor}[${this.name}]~w~`, ...args.map((a) => format(a)));
  }
};
var Logger = _Logger;
__publicField(Logger, "startLogColor", "~cl~");
__publicField(Logger, "nodeCyanColor", "\x1B[36m");
__publicField(Logger, "nodeWhiteColor", "\x1B[37m");
__decorate([
  checkEnabled(LogLevel.Info),
  __metadata("design:type", Function),
  __metadata("design:paramtypes", [Object]),
  __metadata("design:returntype", void 0)
], Logger.prototype, "log", null);
__decorate([
  checkEnabled(LogLevel.Warn),
  __metadata("design:type", Function),
  __metadata("design:paramtypes", [Object]),
  __metadata("design:returntype", void 0)
], Logger.prototype, "warn", null);
__decorate([
  checkEnabled(LogLevel.Error),
  __metadata("design:type", Function),
  __metadata("design:paramtypes", [Object]),
  __metadata("design:returntype", void 0)
], Logger.prototype, "error", null);
__decorate([
  checkEnabled(LogLevel.Info),
  __metadata("design:type", Function),
  __metadata("design:paramtypes", [Object]),
  __metadata("design:returntype", void 0)
], Logger.prototype, "moreInfoServer", null);
__decorate([
  checkEnabled(LogLevel.Info),
  __metadata("design:type", Function),
  __metadata("design:paramtypes", [Object]),
  __metadata("design:returntype", void 0)
], Logger.prototype, "moreInfoClient", null);

// src/logger/index.ts
var Logger2 = class extends Logger {
  constructor(name) {
    super(`client-xstreamer > ${name}`, {
      logLevel: false ? LogLevel.Info : LogLevel.Warn
    });
  }
};

// src/id-provider/class.ts
var IdProvider = class {
  freeIds = [];
  currentId = 0;
  getNext() {
    const freeId = this.freeIds.pop();
    if (freeId != null)
      return freeId;
    const next = this.currentId++;
    if (next >= Number.MAX_SAFE_INTEGER)
      throw new Error(`[IdProvider] failed get next id: next >= ${Number.MAX_SAFE_INTEGER}`);
    return next;
  }
  freeId(id) {
    this.freeIds.push(id);
  }
};

// src/streamer/class.ts
import * as alt3 from "alt-client";
import worker from "worker!./streamer.worker";
var _Streamer = class {
  static get instance() {
    return _Streamer._instance ??= new _Streamer();
  }
  mainStreamSleepMs = 20;
  eventHandlers = {
    ["streamResult" /* StreamResult */]: (streamOut, streamIn, mainStream) => {
      for (let i = 0; i < streamOut.length; ++i)
        this.streamOutEntityHandler(streamOut[i]);
      for (let i = 0; i < streamIn.length; ++i)
        this.streamInEntityHandler(streamIn[i]);
      if (mainStream)
        alt3.setTimeout(() => this.runMainStream(), this.mainStreamSleepMs);
    },
    ["entitiesCreated" /* EntitiesCreated */]: () => {
      const { entityCreateQueue } = this;
      if (!entityCreateQueue.sendPromise)
        return;
      entityCreateQueue.sendPromise.resolve();
      entityCreateQueue.sendPromise = null;
    }
  };
  localPlayer = alt3.Player.local;
  oldPos = { x: 0, y: 0 };
  streamInEntityHandler;
  streamOutEntityHandler;
  entityCreateQueue = {
    chunkSize: 1e4,
    entities: [],
    sendPromise: null,
    started: false
  };
  log = new Logger2("streamer");
  constructor() {
    worker.start();
    this.initEvents();
    this.runMainStream();
  }
  onStreamIn(handler) {
    this.streamInEntityHandler = handler;
  }
  onStreamOut(handler) {
    this.streamOutEntityHandler = handler;
  }
  addPool(pool) {
    this.emitWorker("createPool" /* CreatePool */, pool);
  }
  setPoolMaxStreamedIn(poolId, value) {
    this.log.log("streamer setPoolMaxStreamedIn: ", "poolId:", poolId, "value:", value);
    this.emitWorker("updatePool" /* UpdatePool */, {
      id: poolId,
      maxStreamedIn: value
    });
  }
  addEntity(entity) {
    this.entityCreateQueue.entities.push({
      id: entity.id,
      poolId: entity.poolId,
      pos: {
        x: entity.pos.x,
        y: entity.pos.y
      },
      streamRange: entity.streamRange
    });
    this.startEntityCreateQueue().catch(this.log.error);
  }
  removeEntity(entity) {
    this.emitWorker("destroyEntity" /* DestroyEntity */, entity.id);
  }
  setEntityPos(entity, value) {
    this.emitWorker("updateEntity" /* UpdateEntity */, {
      id: entity.id,
      pos: {
        x: value.x,
        y: value.y
      }
    });
  }
  initEvents() {
    for (const eventName in this.eventHandlers)
      worker.on(eventName, this.eventHandlers[eventName]);
  }
  emitWorker(eventName, ...args) {
    worker.emit(eventName, ...args);
  }
  runMainStream() {
    const {
      pos: { x, y }
    } = this.localPlayer;
    if (x === this.oldPos.x && y === this.oldPos.y) {
      alt3.setTimeout(() => this.runMainStream(), this.mainStreamSleepMs);
      return;
    }
    this.oldPos = { x, y };
    this.emitWorker("stream" /* Stream */, this.oldPos);
  }
  async startEntityCreateQueue() {
    const { entityCreateQueue } = this;
    if (entityCreateQueue.started)
      return;
    entityCreateQueue.started = true;
    const { entities, chunkSize } = entityCreateQueue;
    while (entities.length > 0) {
      const entitiesToSend = entities.splice(0, chunkSize);
      if (entitiesToSend.length < 1)
        return;
      const label = `entitiesCreate (${entitiesToSend[entitiesToSend.length - 1].id})`;
      const start = +new Date();
      this.emitWorker("createEntities" /* CreateEntities */, entitiesToSend);
      await this.waitEntitiesCreate();
      this.log.log(label, "ms:", +new Date() - start);
    }
    entityCreateQueue.started = false;
  }
  waitEntitiesCreate() {
    return new Promise((resolve) => {
      this.entityCreateQueue.sendPromise = { resolve };
    }).catch(this.log.error);
  }
};
var Streamer = _Streamer;
__publicField(Streamer, "_instance", null);

// src/entity/decorators/define-pool.ts
var defineEntityPool = (options = {}) => (EntityClass) => {
  EntityClass.defineEntityPool(options);
};

// src/entity/decorators/init.ts
var init = ({ streamer }) => () => {
  Streamer.instance.onStreamIn(streamer.onStreamIn);
  Streamer.instance.onStreamOut(streamer.onStreamOut);
};

// src/entity/decorators/valid-entity.ts
var validEntity = () => function(target, propertyName, descriptor) {
  const originalMethod = descriptor.value;
  const originalSetter = descriptor.set;
  const originalGetter = descriptor.get;
  if (typeof originalMethod === "function") {
    descriptor.value = function(...args) {
      assertValidEntity(this);
      return originalMethod.apply(this, args);
    };
    return;
  }
  if (typeof originalSetter === "function") {
    descriptor.set = function(value) {
      assertValidEntity(this);
      originalSetter.call(this, value);
    };
  }
  if (typeof originalGetter === "function") {
    descriptor.get = function() {
      assertValidEntity(this);
      return originalGetter.call(this);
    };
  }
};
function assertValidEntity(entity) {
  if (entity.valid)
    return;
  throw new Error(`entity id: ${entity.id} (${entity.constructor?.name}) pool id: ${entity.poolId}) was destroyed`);
}

// src/entity/errors/undefined-pool.ts
var UndefinedEntityPoolError = class extends Error {
  constructor(EntityClass) {
    super(`Entity class: ${EntityClass.name} is not defined as pool.
			Call ${EntityClass.name}.defineEntityPool() or use @defineEntityPool() class decorator`);
  }
};

// src/entity/class.ts
var log = new Logger2("Entity");
var Entity = class {
  static get maxStreamedIn() {
    if (this.__poolId == null || this.__maxStreamedIn == null)
      throw new UndefinedEntityPoolError(this);
    return this.__maxStreamedIn;
  }
  static set maxStreamedIn(value) {
    if (this.__poolId == null)
      throw new UndefinedEntityPoolError(this);
    if (value < 0)
      throw new Error("Entity.maxStreamedIn must be > 0");
    this.__maxStreamedIn = value;
    Streamer.instance.setPoolMaxStreamedIn(this.__poolId, value);
  }
  static getStreamedIn() {
    if (this.__poolId == null || this.__streamedIn == null)
      throw new UndefinedEntityPoolError(this);
    return this.__streamedIn;
  }
  static defineEntityPool(options = {}) {
    if (this === Entity)
      throw new Error("Entity.defineEntityPool cannot be called on Entity class, call it on your class extended from Entity");
    if (this.__poolId != null)
      throw new Error(`${this.name} pool already defined`);
    const {
      maxStreamedIn = 50,
      onStreamIn = () => {
      },
      onStreamOut = () => {
      }
    } = options;
    const id = Entity.__poolIdProvider.getNext();
    Streamer.instance.addPool({
      id,
      maxStreamedIn
    });
    const pool = {
      streamedIn: [],
      onStreamIn,
      onStreamOut
    };
    Entity.__pools[id] = pool;
    this.__poolId = id;
    this.__maxStreamedIn = maxStreamedIn;
    this.__streamedIn = pool.streamedIn;
  }
  static getByID(id) {
    return Entity.__entities[id] ?? null;
  }
  static onStreamInEntityId(entityId) {
    const entity = Entity.__entities[entityId];
    if (!entity) {
      log.error(`Entity.onStreamIn unknown entity: ${entityId}`);
      return;
    }
    if (entity._streamed) {
      log.error(`Entity.onStreamInEntityId already streamed in: ${entityId}`);
      return;
    }
    entity._streamed = true;
    const pool = this.__pools[entity.poolId];
    if (!pool) {
      log.error(`Entity.onStreamInEntityId unknown pool id: ${entity.poolId}`);
      return;
    }
    pool.onStreamIn(entity);
    pool.streamedIn.push(entity);
  }
  static onStreamOutEntityId(entityId) {
    const entity = Entity.__entities[entityId];
    if (!entity) {
      log.error(`Entity.onStreamOutEntityId unknown entity: ${entityId}`);
      return;
    }
    if (!entity._streamed) {
      log.error(`Entity.onStreamOutEntityId already streamed out: ${entityId}`);
      return;
    }
    entity._streamed = false;
    const pool = this.__pools[entity.poolId];
    if (!pool) {
      log.error(`Entity.onStreamInEntityId unknown pool id: ${entity.poolId}`);
      return;
    }
    pool.onStreamOut(entity);
    pool.streamedIn.splice(pool.streamedIn.indexOf(entity), 1);
  }
  _streamed = false;
  _valid = true;
  _pos;
  id = Entity.__entityIdProvider.getNext();
  poolId;
  streamRange;
  constructor(pos, streamRange = 50) {
    const { __poolId: poolId } = this.constructor;
    if (poolId == null)
      throw new UndefinedEntityPoolError(this.constructor);
    this.poolId = poolId;
    this._pos = pos;
    this.streamRange = streamRange;
    Entity.__entities[this.id] = this;
    Streamer.instance.addEntity(this);
  }
  get valid() {
    return this._valid;
  }
  get pos() {
    return this._pos;
  }
  set pos(value) {
    this._pos = value;
    Streamer.instance.setEntityPos(this, value);
  }
  get streamed() {
    return this._streamed;
  }
  destroy() {
    this._valid = false;
    delete Entity.__entities[this.id];
    Entity.__entityIdProvider.freeId(this.id);
    Streamer.instance.removeEntity(this);
    if (this._streamed)
      Entity.__pools[this.poolId].onStreamOut(this);
  }
};
__publicField(Entity, "__poolId", null);
__publicField(Entity, "__maxStreamedIn", null);
__publicField(Entity, "__streamedIn", null);
__publicField(Entity, "__entityIdProvider", new IdProvider());
__publicField(Entity, "__poolIdProvider", new IdProvider());
__publicField(Entity, "__entities", {});
__publicField(Entity, "__pools", {});
__decorateClass([
  validEntity()
], Entity.prototype, "pos", 1);
__decorateClass([
  validEntity()
], Entity.prototype, "streamed", 1);
__decorateClass([
  validEntity()
], Entity.prototype, "destroy", 1);
Entity = __decorateClass([
  init({
    streamer: {
      onStreamIn: Entity.onStreamInEntityId.bind(Entity),
      onStreamOut: Entity.onStreamOutEntityId.bind(Entity)
    }
  })
], Entity);
export {
  Entity,
  defineEntityPool,
  validEntity
};
