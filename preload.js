const fs = require('fs')

const { pinyin } = require('pinyin-pro');
const { parseVCards } = require('js.vcf');
const { resourceLimits } = require('worker_threads');

// datbase schema version
const DBSCHMVER = 2

// init database for query when plugin initial run
function initDB() {
    // all global var
    dbContactListDoc = utools.db.allDocs('list/')
    checkDbSchema()
    db = dbContactListDoc.map(r => r.value)
    dbAllFormat = db.map(
        r => ({
            title: r.name +
                (r.dprt ? (" - " + r.dprt) : "") +
                (r.work ? (" (" + r.work + ")") : ""),
            description: r.tel.toString()
        })
    )
}
initDB()

function checkDbSchema() {
    var dbVer = utools.dbStorage.getItem('info/dbVer')

    if (dbVer && dbVer >= DBSCHMVER) return // database schema is newest

    // schema update
    utools.showNotification("数据库更新中，请稍候...")

    var file = utools.db.getAttachment('info/importFile')
    if (file) {
        var fileType = utools.db.getAttachmentType('info/importFile')
        importFromFile(file, fileType)
    }
    else if (!dbVer) {
        // db schema version 1
        dbContactListDoc.forEach(e => {
            e.value.longPy = { 'dprt': e.value.py[0], 'name': e.value.py[1] }
            e.value.shortPy = { 'dprt': e.value.py[2], 'name': e.value.py[3] }
            delete e.value.py
            utools.dbStorage.setItem(e._id, e.value)
        })
    }
    // else if (dbVer === 2) {}
    else {
        utools.showNotification("数据库出现问题，请重新导入")
    }

    utools.dbStorage.setItem('info/dbVer', DBSCHMVER)
    utools.showNotification("数据库更新完成", 'list_contact')
}

// l = ['部门','姓名','电话','岗位']
function construcObj(conInfoArray) {
    var optPinYin = { toneType: 'none', nonZh: 'consecutive' }
    var optPY = { pattern: 'first', toneType: 'none', nonZh: 'consecutive' }
    return {
        "dprt": conInfoArray[0],
        "name": conInfoArray[1],
        "tel": conInfoArray[2],
        "work": conInfoArray[3],
        "longPy": {
            'dprt': pinyin(conInfoArray[0], optPinYin).replace(/ /g, ""),
            'name': pinyin(conInfoArray[1], optPinYin).replace(/ /g, "",)
        },
        "shortPy": {
            'dprt': pinyin(conInfoArray[0], optPY).replace(/ /g, ""),
            'name': pinyin(conInfoArray[1], optPY).replace(/ /g, "")
        }
    }
}

function parseCSV(queryText) {
    //clear all first
    var rows = queryText.trim()
        .replace(/\n{2,}/g, '\n')
        .split('\n').slice(1)

    var totalRow = rows.length
    var startIdx = utools.dbStorage.getItem('info/nowRows')

    rows.map(row => row.trim().split(','))
        .forEach((l, i) => {
            // l = ['部门','姓名','电话','岗位']
            utools.dbStorage.setItem('list/' + (i + startIdx), construcObj(l))
        })
    startIdx += totalRow
    utools.dbStorage.setItem('info/nowRows', startIdx)
    return [totalRow, startIdx]
}

function parseVCF(vCards) {
    var totalRow = vCards.length
    var startIdx = utools.dbStorage.getItem('info/nowRows')

    vCards.forEach((vCard, i) => {
        // l = ['部门','姓名','电话','岗位']
        if (!vCard.TEL || !vCard.FN) return
        vCard.TEL.forEach(tel => {
            var l = [
                vCard.ORG ? vCard.ORG.map(i => i.VALUE).join(';') : '',
                vCard.FN[0].VALUE,
                tel.VALUE.replace(/ +/g, ''),
                vCard.TITLE ? vCard.TITLE.map(i => i.VALUE).join(';') : '',
            ]

            utools.dbStorage.setItem('list/' + (i + startIdx), construcObj(l))
        })
    })

    utools.dbStorage.setItem('info/nowRows', startIdx + totalRow)
    return [totalRow, startIdx + totalRow]
}

function importFromFile(fileBuff, fileType, delBefore = false) {
    utools.showNotification('开始导入，完成后将提示，请稍候')
    if (delBefore) {
        dbContactListDoc.forEach(e => utools.dbStorage.removeItem(e._id))
        utools.dbStorage.setItem('info/nowRows', 0)
    }

    if (fileType === 'text/csv') {
        var [total, totalRowInDb] = parseCSV(fileBuff.toString())
    } else if (fileType === 'text/vcf') {
        var [total, totalRowInDb] = parseVCF(parseVCards(fileBuff.toString()))
    }
    initDB()
    //store import file for forward compatiblcy
    utools.db.postAttachment('info/importFile', fileBuff, fileType)
    utools.showNotification('导入' + total + '条，目前共有' +
        totalRowInDb + '条，点击查看', 'list_contact')
}


function queryContactList(queryText) {
    var queryText = queryText.replace(/：/g, ':').replace(/，/g, ',')

    var queryTextList = queryText.split(',').map(e => e.split(':'))
    var queryTextRaw = queryTextList.filter(e => e.length === 1)
    var queryTextRaw = queryTextRaw.length === 0 ? null : queryTextRaw[0][0]
    var filterTransIndex = {
        '部门': 'dprt', 'bm': 'dprt',
        '姓名': 'name', 'xm': 'name',
        '电话': 'tel', 'dh': 'tel',
        '岗位': 'work', 'gw': 'work'
    }
    var filterList = queryTextList.filter(e => e.length === 2).map(([k, v]) => [filterTransIndex[k], v])

    const exp = queryTextRaw ? new RegExp(queryTextRaw, "gi") : new RegExp('.*?', "gi")
    // dprt:xx tel:xx n:xx des:xx xx
    return db.filter(r => {
        //hardcopy
        var nr = JSON.parse(JSON.stringify(r))
        if (!filterList) { filterCheck = true }
        else {
            var filterCheck = filterList.every(([k, v]) => {
                if (['dprt', 'name'].includes(k)) {
                    // at least one !== -1
                    var tmpCheck = nr[k].search(v) + nr.shortPy[k].search(v) + nr.longPy[k].search(v) !== -3
                    delete nr.shortPy[k]
                    delete nr.longPy[k]
                }
                else { var tmpCheck = nr[k].search(v) !== -1 }
                delete nr[k]
                return tmpCheck
            })
        }

        if (!queryTextRaw) { var textCheck = true }
        else if (RegExp("^\\d+$").test(queryTextRaw)) {
            var textCheck = exp.test(nr.tel)
        } else if (RegExp('^[0-9a-z.*]*$', 'gi').test(queryTextRaw)) {
            var textCheck = [...Object.values(nr.longPy), ...Object.values(nr.shortPy)]
                .some(py => exp.test(py))
        } else {
            var textCheck = [nr.name, nr.dprt, nr.work].some(e => exp.test(e))
        }
        return filterCheck && textCheck
    }).map(r => ({
        title: r.name +
            (r.dprt ? (" - " + r.dprt) : "") +
            (r.work ? (" (" + r.work + ")") : ""),
        text: r.name +
            (r.dprt ? (" - " + r.dprt) : "") +
            (r.work ? (" (" + r.work + ")") : ""),
        description: r.tel.toString()
    }))
}

function copyInfo(contactObj) {
    utools.copyText(
        '联系人信息：' + contactObj.title + '\n' +
        '联系方式：' + contactObj.description
    )
    utools.showNotification('详情已复制到剪贴板')
}

// utools 4.0 new api, push to main window 
utools.onMainPush(
    // callback, show first 6 line, due to api restrict
    ({ code, type, payload }) => queryContactList(payload).slice(0, 6),

    //selectCallback
    ({ code, type, payload, option }) => copyInfo(option)
)

window.exports = {
    'list_contact': {
        mode: 'list',
        args: {
            placeholder: "输入姓名 电话 公司 部门",
            enter: (action, callbackSetList) => callbackSetList(dbAllFormat),
            search: (action, searchWord, callbackSetList) => {
                if (!searchWord) return callbackSetList(dbAllFormat)
                return callbackSetList(queryContactList(searchWord))
            },
            select: (action, itemData) => copyInfo(itemData)
        }
    },
    'list_contact_main_window': {
        mode: 'none',
        args: { enter: (action) => utools.redirect('通讯录', null) }
    },
    'new_list': {
        mode: "list",
        args: {
            placeholder: "请选择导入模式",
            enter: ({ code, type, payload }, callbackSetList) => {
                return callbackSetList(
                    [
                        {
                            title: '合并导入',
                            description: '附加导入选定文件内容，不会删除原有通讯录',
                            delBefore: false,
                            payload: payload
                        }, {
                            title: '清空后导入',
                            description: '导入选定文件内容，原通讯录会**全部删除**',
                            delBefore: true,
                            payload: payload
                        }
                    ])
            },
            select: (action, itemData) => {
                var payload = itemData.payload.pop()
                utools.hideMainWindow()
                var fileType = 'text/' + payload.name.split('.').pop().toLowerCase()
                fs.readFile(payload.path, (err, data) => importFromFile(data, fileType, itemData.delBefore))
            }
        }
    },
    'export_temp': {
        mode: "none",
        args: {
            enter: ({ code, type, payload }) => {
                const savePath = utools.showSaveDialog({
                    title: '保存位置',
                    defaultPath: utools.getPath('downloads') + '/' + '导入模板.csv',
                    buttonLabel: '保存'
                })
                utools.hideMainWindow()
                //加入BOM 避免乱码
                var content = "\ufeff" + '部门,姓名,电话,岗位'
                fs.writeFileSync(savePath, content)
                utools.showNotification('导入模板保存在' + savePath + '，请填写后导入')
            }
        }
    }
}
