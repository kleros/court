/**
 * Returns an array containing a range of numbers. O(n).
 *
 * It can be called with 1 or 2 parameters like:
 *
 *  `range(length)` - Will produce an array of size `length` with items from `0` to `length - 1`.
 *  `range(start, end)` - Will produce an array of size `end - start` with items from `start` to `end - 1`.
 *
 * Examples:
 *
 * - `range(10)     // --> [0, 1, ..., 9]`
 * - `range(0, 10)  // --> [0, 1, ..., 9] (same as range(10))`
 * - `range(10, 20) // --> [10, 11, ..., 19]`
 *
 * @param {number} lengthOrStart The length of the array or its starting value (inclusive).
 * @param {number|undefined} end [OPTIONAL] If ommited, `lengthOrStart` is treated like it's the length of the array. If provided it will determine its ending value (exclusive).
 * @return {number[]} The range array.
 */
export const range = (lengthOrStart, end) => {
  const length = end === undefined ? lengthOrStart : end - lengthOrStart;
  const start = end === undefined ? 0 : lengthOrStart;

  return Array(length)
    .fill()
    .map((_, i) => start + i);
};

/**
 * Returns an array containing arrays for the binary permutation of `length` bits. O(2^n).
 *
 * Each item in the nested array is the value of the bit in the n-th position.
 *
 * Example:
 *
 * - `binaryPermutation(3)` will produce:
 *
 *    [ [ 0, 0, 0 ],
 *      [ 0, 0, 1 ],
 *      [ 0, 1, 0 ],
 *      [ 0, 1, 1 ],
 *      [ 1, 0, 0 ],
 *      [ 1, 0, 1 ],
 *      [ 1, 1, 0 ],
 *      [ 1, 1, 1 ] ]
 *
 * @param {number} length The number of bits to generate the permutation.
 * @return {(0|1)[][]} The binary permutation of `length` bits.
 */
export const binaryPermutation = (length) => {
  const permutations = [];
  for (let i = 0; i < Math.pow(2, length); i++) {
    permutations.push(i.toString(2).padStart(length, "0").split("").map(Number));
  }
  return permutations;
};
