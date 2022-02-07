// src/streamer/streamer.worker.ts
import * as alt from "alt-worker";

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
      this.runStreamProcess();
      this.emitClient("entitiesCreated" /* EntitiesCreated */);
    },
    ["destroyEntity" /* DestroyEntity */]: (entityId) => {
      const entity = this.entities[entityId];
      if (!entity) {
        this.logError(`[destroyEntity] id: ${entityId} not found`);
        return;
      }
      delete this.entities[entityId];
      this.regenerateEntityArray();
      this.runStreamProcess();
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
      this.lastStreamingPos = streamingPos;
      this.runStreamProcess(streamingPos, true);
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
      if (maxStreamedIn != null) {
        pool.maxStreamedIn = maxStreamedIn;
        this.runStreamProcess();
      }
    }
  };
  pools = {};
  entities = {};
  entityArray = [];
  lastStreamingPos = { x: 0, y: 0 };
  log = false ? (...args) => alt.log("~cl~[streamer-worker]~w~", ...args) : () => {
  };
  constructor() {
    this.initEvents();
  }
  initEvents() {
    for (const eventName in this.eventHandlers)
      alt.on(eventName, this.eventHandlers[eventName]);
  }
  emitClient(eventName, ...args) {
    alt.emit(eventName, ...args);
  }
  logError(...args) {
    alt.logError("[streamer-worker]", ...args);
  }
  logWarn(...args) {
    alt.logWarning("[streamer-worker]", ...args);
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
    const { entityArray } = this;
    for (let i = 0; i < entityArray.length; i++) {
      const entity = entityArray[i];
      entity.dist = distance2dInRange(entity.pos, streamingPos, entity.streamRange);
    }
    entityArray.sort(this.sortEntitiesByDistance);
    const poolsStreamIn = {};
    for (const poolId in this.pools)
      poolsStreamIn[poolId] = 0;
    let lastIdx = 0;
    for (let i = 0; i < entityArray.length; i++) {
      const arrEntity = entityArray[lastIdx];
      const entity = this.entities[arrEntity.id];
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
      const entity = this.entities[arrEntity.id];
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
  runStreamProcess(streamingPos = this.lastStreamingPos, mainStream = false) {
    const {
      streamIn,
      streamOut
    } = this.streamProcess(streamingPos);
    this.emitClient("streamResult" /* StreamResult */, streamOut, streamIn, mainStream);
  }
};
new StreamWorker();
