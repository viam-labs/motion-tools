/** Assertion functions for runtime and type safety. */
export declare class AssertionError extends Error {
    constructor(message: string);
}
/**
 * Assert that a value is defined.
 *
 * @example
 * const stringify = (value: number | undefined): number => {
 *  assertExists(value)
 *  return `${value}` // TS now knows that value is of type `number`
 * }
 */
export declare const assertExists: <T>(value: T, message: string) => asserts value is NonNullable<T>;
