/*global atob, Blob, FileReader*/
import COMMAND from '../../../session/command';
import FileListWrapper from './file-list-wrapper';
import nativeMethods from '../native-methods';
import transport from '../../transport';
import settings from '../../settings';
import * as Browser from '../../utils/browser';
import * as HiddenInfo from './hidden-info';
import SHADOW_UI_CLASSNAME from '../../../shadow-ui/class-name';
import Promise from 'pinkie';
import { arrayProto, stringProto, functionProto } from '../../../protos';

// NOTE: https://html.spec.whatwg.org/multipage/forms.html#fakepath-srsly.
const FAKE_PATH_STRING = 'C:\\fakepath\\';

const UPLOAD_IFRAME_FOR_IE9_ID = 'uploadIframeForIE9' + SHADOW_UI_CLASSNAME.postfix;

export default class UploadInfoManager {
    constructor (shadowUI) {
        this.shadowUI = shadowUI;
        this.uploadInfo = [];
    }

    static _getFileListData (fileList) {
        var data = [];

        for (var i = 0; i < fileList.length; i++)
            arrayProto.push(data, fileList[i].base64);

        return data;
    }

    static _getUploadIframeForIE9 () {
        var uploadIframe = functionProto.call(nativeMethods.querySelector, document, '#' + UPLOAD_IFRAME_FOR_IE9_ID);

        if (!uploadIframe) {
            uploadIframe               = functionProto.call(nativeMethods.createElement, document, 'iframe');

            functionProto.call(nativeMethods.setAttribute, uploadIframe, 'id', UPLOAD_IFRAME_FOR_IE9_ID);
            functionProto.call(nativeMethods.setAttribute, uploadIframe, 'name', UPLOAD_IFRAME_FOR_IE9_ID);
            uploadIframe.style.display = 'none';

            this.shadowUI.getRoot().appendChild(uploadIframe);
        }

        return uploadIframe;
    }

    _loadFileListDataForIE9 (input) {
        return Promise(resolve => {
            var form = input.form;

            if (form && input.value) {
                var sourceTarget       = form.target;
                var sourceActionString = form.action;
                var sourceMethod       = form.method;
                var uploadIframe       = UploadInfoManager._getUploadIframeForIE9();

                var loadHandler = () => {
                    var fileListWrapper = new FileListWrapper([JSON.parse(uploadIframe.contentWindow.document.body.innerHTML)]);

                    uploadIframe.removeEventListener('load', loadHandler);
                    resolve(fileListWrapper);
                };

                uploadIframe.addEventListener('load', loadHandler);

                form.action = settings.get().ie9FileReaderShimUrl + '?input-name=' + input.name + '&filename=' +
                              input.value;
                form.target = UPLOAD_IFRAME_FOR_IE9_ID;
                form.method = 'post';

                form.submit();

                form.action = sourceActionString;
                form.target = sourceTarget;
                form.method = sourceMethod;
            }
            else
                resolve(new FileListWrapper([]));
        });
    }

    static formatValue (fileNames) {
        var value = '';

        fileNames = typeof fileNames === 'string' ? [fileNames] : fileNames;

        if (fileNames && fileNames.length) {
            if (Browser.isWebKit)
                value = FAKE_PATH_STRING + arrayProto.pop(stringProto.split(fileNames[0], '/'));
            else if (Browser.isIE9 || Browser.isIE10) {
                var filePaths = [];

                for (var i = 0; i < fileNames.length; i++)
                    arrayProto.push(filePaths, FAKE_PATH_STRING + arrayProto.pop(stringProto.split(fileNames[i], '/')));

                value = arrayProto.join(filePaths, ', ');
            }
            else
                return arrayProto.pop(stringProto.split(fileNames[0], '/'));
        }

        return value;
    }

    static getFileNames (fileList, value) {
        var result = [];

        if (fileList) {
            for (var i = 0; i < fileList.length; i++)
                arrayProto.push(result, fileList[i].name);
        }
        else if (stringProto.lastIndexOf(value, '\\') !== -1)
            arrayProto.push(result, stringProto.substr(value, stringProto.lastIndexOf(value, '\\') + 1));

        return result;
    }

    static loadFilesInfoFromServer (filePaths) {
        return transport.asyncServiceMsg({
            cmd:       COMMAND.getUploadedFiles,
            filePaths: typeof filePaths === 'string' ? [filePaths] : filePaths
        });
    }

    static prepareFileListWrapper (filesInfo) {
        var errs           = [];
        var validFilesInfo = [];

        for (var i = 0; i < filesInfo.length; i++) {
            if (filesInfo[i].err)
                arrayProto.push(errs, filesInfo[i]);
            else
                arrayProto.push(validFilesInfo, filesInfo[i]);
        }

        return {
            errs:     errs,
            fileList: new FileListWrapper(validFilesInfo)
        };
    }

    static sendFilesInfoToServer (fileList, fileNames) {
        return transport.asyncServiceMsg({
            cmd:       COMMAND.uploadFiles,
            data:      UploadInfoManager._getFileListData(fileList),
            fileNames: fileNames
        });
    }

    clearUploadInfo (input) {
        var inputInfo = this.getUploadInfo(input);

        if (inputInfo) {
            inputInfo.files = new FileListWrapper([]);
            inputInfo.value = '';

            return HiddenInfo.removeInputInfo(input);
        }
    }

    getFiles (input) {
        var inputInfo = this.getUploadInfo(input);

        return inputInfo ? inputInfo.files : new FileListWrapper([]);
    }

    getUploadInfo (input) {
        for (var i = 0; i < this.uploadInfo.length; i++) {
            if (this.uploadInfo[i].input === input)
                return this.uploadInfo[i];
        }

        return null;
    }

    getValue (input) {
        var inputInfo = this.getUploadInfo(input);

        return inputInfo ? inputInfo.value : '';
    }

    loadFileListData (input, fileList) {
        /*eslint-disable no-else-return */
        if (Browser.isIE9)
            return this._loadFileListDataForIE9(input);
        else if (!fileList.length)
            return Promise.resolve(new FileListWrapper([]));
        else {
            return new Promise(resolve => {
                var index       = 0;
                var fileReader  = new FileReader();
                var file        = fileList[index];
                var readedFiles = [];

                fileReader.addEventListener('load', e => {
                    arrayProto.push(readedFiles, {
                        data: stringProto.substr(e.target.result, stringProto.indexOf(e.target.result, ',') + 1),
                        /* eslint-disable hammerhead/proto-methods */
                        blob: file.slice(0, file.size),
                        /* eslint-enable hammerhead/proto-methods */
                        info: {
                            type:             file.type,
                            name:             file.name,
                            lastModifiedDate: file.lastModifiedDate
                        }
                    });

                    if (fileList[++index]) {
                        file = fileList[index];
                        fileReader.readAsDataURL(file);
                    }
                    else
                        resolve(new FileListWrapper(readedFiles));
                });
                fileReader.readAsDataURL(file);
            });
        }
        /*eslint-enable no-else-return */
    }

    setUploadInfo (input, fileList, value) {
        var inputInfo = this.getUploadInfo(input);

        if (!inputInfo) {
            inputInfo = { input: input };
            arrayProto.push(this.uploadInfo, inputInfo);
        }

        inputInfo.files = fileList;
        inputInfo.value = value;

        HiddenInfo.addInputInfo(input, fileList, value);
    }
}
