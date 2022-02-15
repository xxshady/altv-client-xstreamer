// Generated by dts-bundle-generator v6.5.0

import * as alt from 'alt-client';

interface IEntityPoolOptions<TEntity extends Entity = Entity> {
	maxStreamedIn?: number;
	onStreamIn?: (entity: TEntity) => void;
	onStreamOut?: (entity: TEntity) => void;
}
export declare class Entity {
	private static __poolId;
	private static __maxStreamedIn;
	private static __streamedIn;
	private static readonly __entityIdProvider;
	private static readonly __poolIdProvider;
	private static readonly __entities;
	private static readonly __pools;
	static get maxStreamedIn(): number;
	static set maxStreamedIn(value: number);
	static getStreamedIn<T extends typeof Entity>(this: T): InstanceType<T>[];
	static defineEntityPool<T extends typeof Entity>(this: T, options?: IEntityPoolOptions<InstanceType<T>>): void;
	static getByID(id: number): Entity | null;
	private static onStreamInEntityId;
	private static onStreamOutEntityId;
	private _streamed;
	private _valid;
	private _pos;
	readonly id: number;
	readonly poolId: number;
	readonly streamRange: number;
	constructor(pos: alt.IVector3, streamRange?: number);
	get valid(): boolean;
	get pos(): alt.IVector3;
	set pos(value: alt.IVector3);
	get streamed(): boolean;
	destroy(): void;
}
export declare const defineEntityPool: <T extends Entity>(options?: IEntityPoolOptions<T>) => (EntityClass: {
	new (...args: any[]): T;
	defineEntityPool: (options?: IEntityPoolOptions<any> | undefined) => void;
}) => void;
export declare const validEntity: () => (target: {
	constructor: {
		name: string;
	};
}, propertyName: string, descriptor: PropertyDescriptor) => void;

export {};
