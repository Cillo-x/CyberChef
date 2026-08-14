/**
 * @author Cillo-x [58360548+Cillo-x@users.noreply.github.com]
 * @copyright Crown Copyright 2026
 * @license Apache-2.0
 */
// cspell:ignore Cillo

import Operation from "../Operation.mjs";
import OperationError from "../errors/OperationError.mjs";

const BASE64_ALPHABET_LENGTH = 64,
    MAX_LOOKUP_TABLE_LENGTH = 256;

/**
 * Extract Base64 Alphabet operation
 */
class ExtractBase64Alphabet extends Operation {

    /**
     * ExtractBase64Alphabet constructor
     */
    constructor() {
        super();

        this.name = "Extract Base64 Alphabet";
        this.module = "Default";
        this.description = "Reconstructs a 64-byte Base64 encoding alphabet from a binary decoding lookup table. Each input offset is treated as an encoded byte, and table values <code>0</code> through <code>63</code> identify its position in the alphabet. Other values, such as padding and invalid-character markers, are ignored.";
        this.infoURL = "https://wikipedia.org/wiki/Base64";
        this.inputType = "byteArray";
        this.outputType = "byteArray";
        this.args = [];
    }

    /**
     * @param {byteArray} input
     * @returns {byteArray}
     */
    run(input) {
        if (input.length > MAX_LOOKUP_TABLE_LENGTH) {
            throw new OperationError(`Lookup table must not exceed ${MAX_LOOKUP_TABLE_LENGTH} bytes (received ${input.length}).`);
        }

        const alphabet = new Array(BASE64_ALPHABET_LENGTH),
            sourceBytes = new Array(BASE64_ALPHABET_LENGTH).fill(-1);

        for (let byte = 0; byte < input.length; byte++) {
            const value = input[byte];

            if (value >= BASE64_ALPHABET_LENGTH) continue;

            if (sourceBytes[value] !== -1) {
                const firstByte = sourceBytes[value].toString(16).padStart(2, "0"),
                    duplicateByte = byte.toString(16).padStart(2, "0");
                throw new OperationError(`Base64 value ${value} is mapped by both byte 0x${firstByte} and byte 0x${duplicateByte}.`);
            }

            alphabet[value] = byte;
            sourceBytes[value] = byte;
        }

        const missingValue = sourceBytes.indexOf(-1);
        if (missingValue !== -1) {
            throw new OperationError(`Lookup table is missing a byte for Base64 value ${missingValue}.`);
        }

        return alphabet;
    }

}

export default ExtractBase64Alphabet;
