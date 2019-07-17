export function convertFilePath(filePath: string) {
    return filePath.substring(1);
}
export function sortObj(obj: any) {
    let sortedObj: any = {};
    if (isPlainObject(obj)) {
        Object.keys(obj)
            .sort()
            .forEach((key) =>  {
                sortedObj[key] = sortObj(obj[key]);
            });
    } else {
        sortedObj = obj;
    }
    return sortedObj;
}
export function isPlainObject(val: any) {
    return Object.prototype.toString.call(val) === '[object Object]';
}
