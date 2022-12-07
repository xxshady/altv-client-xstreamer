// src/utils/distance-2d.ts
var distance2dInRange = (a, b, range) => {
  const ab1 = b.x - a.x;
  const ab2 = b.y - a.y;
  if (Math.abs(ab1) > range)
    return Infinity;
  if (Math.abs(ab2) > range)
    return Infinity;
  return Math.sqrt(ab1 * ab1 + ab2 * ab2);
};

// src/streamer/alt-mock.ts
var workerEvents = {};
var workerDelayedEvents = /* @__PURE__ */ new Map();
var clientEvents = {};
var worker = {
  log(...args) {
    console.log("[worker]", ...args);
  },
  logError(...args) {
    console.error("[worker]", ...args);
  },
  logWarning(...args) {
    console.warn("[worker]", ...args);
  },
  on(event, handler) {
    workerEvents[event] = handler;
  },
  emit(event, ...args) {
    clientEvents[event](...args);
  },
  ready() {
    for (const [event, calls] of workerDelayedEvents) {
      console.log("worker.ready", "calling event:", event, "calls:", calls.length);
      for (const args of calls)
        workerEvents[event](...args);
    }
  }
};

// src/streamer/streamer.worker.ts
var StreamWorker = class {
  eventHandlers = {
    ["createEntities" /* CreateEntities */]: (entities) => {
      for (let i = 0; i < entities.length; i++) {
        const {
          id,
          poolId,
          pos,
          streamRange
        } = entities[i];
        const entity = {
          id,
          poolId,
          pos,
          streamRange,
          streamed: false
        };
        this.addEntityIntoArray(entity);
        this.entities[id] = entity;
      }
      this.emitClient("entitiesCreated" /* EntitiesCreated */);
    },
    ["destroyEntity" /* DestroyEntity */]: (entityId) => {
      const entity = this.entities[entityId];
      if (!entity) {
        return;
      }
      delete this.entities[entityId];
      this.regenerateEntityArray();
    },
    ["createPool" /* CreatePool */]: ({ id, maxStreamedIn }) => {
      if (this.pools[id]) {
        this.logError(`[createPool] id: ${id} already exists`);
        return;
      }
      this.pools[id] = {
        id,
        maxStreamedIn
      };
    },
    ["stream" /* Stream */]: (streamingPos) => {
      this.runStreamProcess(streamingPos);
    },
    ["updatePool" /* UpdatePool */]: (poolUpdate) => {
      const pool = this.pools[poolUpdate.id];
      if (!pool) {
        this.logError(`[updatePool] pool: ${poolUpdate.id} not found`);
        return;
      }
      const {
        maxStreamedIn
      } = poolUpdate;
      if (maxStreamedIn != null)
        pool.maxStreamedIn = maxStreamedIn;
    },
    ["updateEntity" /* UpdateEntity */]: (entityUpdate) => {
      const entity = this.entities[entityUpdate.id];
      if (!entity) {
        this.logError(`[updateEntity] entity: ${entityUpdate.id} not found`);
        return;
      }
      const {
        pos
      } = entityUpdate;
      if (pos != null)
        entity.pos = pos;
    }
  };
  pools = {};
  entities = {};
  entityArray = [];
  log = true ? (...args) => worker.log("~cl~[streamer-worker]~w~", ...args) : () => {
  };
  constructor() {
    this.initEvents();
  }
  initEvents() {
    for (const eventName in this.eventHandlers)
      worker.on(eventName, this.eventHandlers[eventName]);
  }
  emitClient(eventName, ...args) {
    worker.emit(eventName, ...args);
  }
  logError(...args) {
    worker.logError("[streamer-worker]", ...args);
  }
  logWarn(...args) {
    worker.logWarning("[streamer-worker]", ...args);
  }
  addEntityIntoArray(entity) {
    this.entityArray.push({
      id: entity.id,
      poolId: entity.poolId,
      pos: {
        x: entity.pos.x,
        y: entity.pos.y
      },
      streamRange: entity.streamRange,
      streamed: entity.streamed,
      dist: Infinity
    });
  }
  regenerateEntityArray() {
    this.entityArray = [];
    for (const entityId in this.entities)
      this.addEntityIntoArray(this.entities[entityId]);
  }
  streamProcess(streamingPos) {
    const streamInIds = [];
    const streamOutIds = [];
    const { entityArray, entities } = this;
    for (let i = 0; i < entityArray.length; i++) {
      const arrEntity = entityArray[i];
      const entity = entities[arrEntity.id];
      arrEntity.dist = distance2dInRange(entity.pos, streamingPos, arrEntity.streamRange);
    }
    entityArray.sort(this.sortEntitiesByDistance);
    const poolsStreamIn = {};
    for (const poolId in this.pools)
      poolsStreamIn[poolId] = 0;
    let lastIdx = 0;
    for (let i = 0; i < entityArray.length; i++) {
      const arrEntity = entityArray[lastIdx];
      const entity = entities[arrEntity.id];
      if (arrEntity.dist > arrEntity.streamRange) {
        lastIdx++;
        this.streamOutEntity(entity, arrEntity, streamOutIds);
        continue;
      }
      const poolStreamIn = poolsStreamIn[arrEntity.poolId] + 1;
      if (poolStreamIn > this.pools[arrEntity.poolId].maxStreamedIn)
        continue;
      lastIdx++;
      poolsStreamIn[arrEntity.poolId] = poolStreamIn;
      this.streamInEntity(entity, arrEntity, streamInIds);
    }
    for (let i = lastIdx; i < entityArray.length; i++) {
      const arrEntity = entityArray[i];
      const entity = entities[arrEntity.id];
      this.streamOutEntity(entity, arrEntity, streamOutIds);
    }
    return {
      streamIn: streamInIds,
      streamOut: streamOutIds
    };
  }
  sortEntitiesByDistance(a, b) {
    return a.dist - b.dist;
  }
  streamOutEntity(entity, arrEntity, streamOutIds) {
    if (!entity.streamed)
      return;
    entity.streamed = false;
    arrEntity.streamed = false;
    streamOutIds.push(entity.id);
  }
  streamInEntity(entity, arrEntity, streamInIds) {
    if (entity.streamed)
      return;
    entity.streamed = true;
    arrEntity.streamed = false;
    streamInIds.push(entity.id);
  }
  runStreamProcess(streamingPos) {
    const {
      streamIn,
      streamOut
    } = this.streamProcess(streamingPos);
    this.emitClient("streamResult" /* StreamResult */, streamOut, streamIn);
  }
};
new StreamWorker();
worker.ready();
