/**
 * ExtractBase64Alphabet tests
 *
 * @author Cillo-x [58360548+Cillo-x@users.noreply.github.com]
 * @copyright Crown Copyright 2026
 * @license Apache-2.0
 */

import TestRegister from "../../lib/TestRegister.mjs";

const DIGIT_FIRST_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/",
    STANDARD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Builds a binary decoding table and formats it for From Hex.
 *
 * @param {string|number[]} alphabet
 * @param {number} length
 * @returns {number[]}
 */
function makeLookupTable(alphabet, length=256) {
    const alphabetBytes = typeof alphabet === "string" ?
            Array.from(alphabet, char => char.charCodeAt(0)) : alphabet,
        table = new Array(length).fill(0xff);

    alphabetBytes.forEach((byte, value) => {
        table[byte] = value;
    });

    return table;
}

/**
 * @param {number[]} bytes
 * @returns {string}
 */
function toHex(bytes) {
    return bytes.map(byte => byte.toString(16).padStart(2, "0")).join("");
}

const digitFirstTable = makeLookupTable(DIGIT_FIRST_ALPHABET),
    duplicateTable = makeLookupTable(STANDARD_ALPHABET),
    missingTable = makeLookupTable(STANDARD_ALPHABET),
    binaryAlphabet = [...Array(64).keys()],
    binaryAlphabetHex = toHex(binaryAlphabet);

digitFirstTable[0x09] = 0xfe;
digitFirstTable[0x0a] = 0xfe;
digitFirstTable[0x0d] = 0xfe;
digitFirstTable[0x20] = 0xfe;
digitFirstTable[0x3d] = 0x40;
duplicateTable[0x2d] = 62;
missingTable[0x41] = 0xff;

TestRegister.addTests([
    {
        name: "Extract Base64 Alphabet: digit-first table with sentinels",
        input: toHex(digitFirstTable),
        expectedOutput: DIGIT_FIRST_ALPHABET,
        recipeConfig: [
            {
                op: "From Hex",
                args: ["None"]
            },
            {
                op: "Extract Base64 Alphabet",
                args: []
            }
        ]
    },
    {
        name: "Extract Base64 Alphabet: 128-byte ASCII lookup table",
        input: toHex(makeLookupTable(STANDARD_ALPHABET, 128)),
        expectedOutput: STANDARD_ALPHABET,
        recipeConfig: [
            {
                op: "From Hex",
                args: ["None"]
            },
            {
                op: "Extract Base64 Alphabet",
                args: []
            }
        ]
    },
    {
        name: "Extract Base64 Alphabet: preserves non-printable alphabet bytes",
        input: toHex(makeLookupTable(binaryAlphabet)),
        expectedOutput: binaryAlphabetHex,
        recipeConfig: [
            {
                op: "From Hex",
                args: ["None"]
            },
            {
                op: "Extract Base64 Alphabet",
                args: []
            },
            {
                op: "To Hex",
                args: ["None", 0]
            }
        ]
    },
    {
        name: "Extract Base64 Alphabet: rejects a missing mapping",
        input: toHex(missingTable),
        expectedOutput: "Lookup table is missing a byte for Base64 value 0.",
        recipeConfig: [
            {
                op: "From Hex",
                args: ["None"]
            },
            {
                op: "Extract Base64 Alphabet",
                args: []
            }
        ]
    },
    {
        name: "Extract Base64 Alphabet: rejects an ambiguous mapping",
        input: toHex(duplicateTable),
        expectedOutput: "Base64 value 62 is mapped by both byte 0x2b and byte 0x2d.",
        recipeConfig: [
            {
                op: "From Hex",
                args: ["None"]
            },
            {
                op: "Extract Base64 Alphabet",
                args: []
            }
        ]
    },
    {
        name: "Extract Base64 Alphabet: rejects tables larger than one byte domain",
        input: toHex(makeLookupTable(STANDARD_ALPHABET, 257)),
        expectedOutput: "Lookup table must not exceed 256 bytes (received 257).",
        recipeConfig: [
            {
                op: "From Hex",
                args: ["None"]
            },
            {
                op: "Extract Base64 Alphabet",
                args: []
            }
        ]
    }
]);
