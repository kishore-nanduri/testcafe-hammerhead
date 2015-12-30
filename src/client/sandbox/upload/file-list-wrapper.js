import { arrayProto, stringProto } from '../../../protos';

export default class FileListWrapper {
    constructor (fileList) {
        this.length = fileList.length;
        this.item   = index => this[index];

        for (var i = 0; i < fileList.length; i++)
            this[i] = FileListWrapper._createFileWrapper(fileList[i]);
    }

    static _base64ToBlob (base64Data, mimeType, sliceSize) {
        mimeType  = mimeType || '';
        sliceSize = sliceSize || 512;

        var byteCharacters = atob(base64Data);
        var byteArrays     = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice       = arrayProto.slice(byteCharacters, offset, offset + sliceSize);
            var byteNumbers = new Array(slice.length);

            for (var i = 0; i < slice.length; i++)
                byteNumbers[i] = stringProto.charCodeAt(slice, i);

            arrayProto.push(byteArrays, new Uint8Array(byteNumbers));
        }

        return new Blob(byteArrays, { type: mimeType });
    }

    static _createFileWrapper (fileInfo) {
        var wrapper = null;

        if (!window.Blob) {
            wrapper = {
                size: fileInfo.info.size,
                type: fileInfo.info.type
            };
        }
        else if (fileInfo.blob)
            wrapper = new Blob([fileInfo.blob], { type: fileInfo.info.type });
        else
            wrapper = FileListWrapper._base64ToBlob(fileInfo.data, fileInfo.info.type);

        wrapper.name             = fileInfo.info.name;
        wrapper.lastModifiedDate = new Date(fileInfo.info.lastModifiedDate);
        wrapper.base64           = fileInfo.data;

        return wrapper;
    }
}
