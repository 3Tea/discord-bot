export declare function init(): any;
/**
 *
 * @param key
 * @param value
 * @param {Second} time
 */
export declare function setJson(key: String, value: any, time?: number): Promise<any>;
export declare function getJson(key: String): Promise<any>;
export declare function deleteKey(key: String): Promise<any>;
export declare function flushdb(): Promise<any>;
