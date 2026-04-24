"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomInRange = randomInRange;
function randomInRange(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
