import INTERNAL_ATTRS from '../../../processing/dom/internal-attributes';
import { arrayProto } from '../../../protos';

function createInput (form) {
    var hiddenInput = document.createElement('input');

    hiddenInput.type  = 'hidden';
    hiddenInput.name  = INTERNAL_ATTRS.uploadInfoHiddenInputName;
    hiddenInput.value = '[]';

    form.appendChild(hiddenInput);

    return hiddenInput;
}

function getInput (form) {
    return form.querySelector('[name="' + INTERNAL_ATTRS.uploadInfoHiddenInputName + '"]') || createInput(form);
}

function getInputIndex (info, input) {
    for (var index = 0; index < info.length; index++) {
        if (info[index].id === input.id || info[index].name === input.name)
            return index;
    }

    return -1;
}

export function addInputInfo (input, fileList, value) {
    var formInfo = getFormInfo(input);

    if (formInfo) {
        var files = [];

        arrayProto.forEach(arrayProto.slice(fileList), file => {
            arrayProto.push(files, {
                name: file.name,
                type: file.type,
                data: file.base64
            });
        });

        var inputInfoIndex = getInputIndex(formInfo, input);
        var inputInfo      = {
            id:    input.id,
            name:  input.name,
            files: files,
            value: value
        };

        if (inputInfoIndex === -1)
            arrayProto.push(formInfo, inputInfo);
        else
            formInfo[inputInfoIndex] = inputInfo;

        setFormInfo(input, formInfo);
    }
}

export function getFormInfo (input) {
    return input.form ? JSON.parse(getInput(input.form).value) : null;
}

export function setFormInfo (input, info) {
    if (input.form) {
        var hiddenInput = getInput(input.form);

        hiddenInput.value = JSON.stringify(info);
    }
}

export function removeInputInfo (input) {
    var uploadInfo = getFormInfo(input);

    if (uploadInfo) {
        var inputInfoIndex = getInputIndex(uploadInfo, input);

        if (inputInfoIndex !== -1) {
            arrayProto.splice(uploadInfo, inputInfoIndex, 1);
            setFormInfo(input, uploadInfo);

            return true;
        }
    }

    return false;
}
