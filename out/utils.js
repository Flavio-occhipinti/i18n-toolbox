"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function convertFilePath(filePath) {
    return filePath.substring(1);
}
exports.convertFilePath = convertFilePath;
function sortObj(obj) {
    let sortedObj = {};
    if (isPlainObject(obj)) {
        Object.keys(obj)
            .sort()
            .forEach((key) => {
            sortedObj[key] = sortObj(obj[key]);
        });
    }
    else {
        sortedObj = obj;
    }
    return sortedObj;
}
exports.sortObj = sortObj;
function isPlainObject(val) {
    return Object.prototype.toString.call(val) === '[object Object]';
}
exports.isPlainObject = isPlainObject;
//# sourceMappingURL=utils.js.map