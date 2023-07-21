const fs = require('fs')

const { pinyin } = require('pinyin-pro');
const { parseVCards } = require('js.vcf')


function initDB() {
    //  db = []
    // all global
    allDoc = utools.db.allDocs('list/')
    db = allDoc.map(r => r.value)
    // allDoc.forEach(r => db.push(r.value))
    // dbAllShow = []
    dbAllShow = db.map(
        r => ({
            title: r.name +
                (r.dprt ? (" - " + r.dprt) : "") +
                (r.work ? (" (" + r.work + ")") : ""),
            description: r.tel.toString()
        })
    )
}
initDB()

function getContactList(queryText) {
    var queryText = queryText.replace(/ +/g, '.*')
    const exp = new RegExp(queryText, "gi")
    return db.filter(r => {
        if (RegExp("^\\d+$").test(queryText)) {
            return exp.test(r.tel)
        } else if (RegExp('^[0-9a-z.*]*$', 'gi').test(queryText)) {
            return r.py.some(py => exp.test(py))
        } else {
            return [r.name, r.dprt, r.work].some(e => exp.test(e))
        }
    }).map(r =>
    ({
        title: r.name +
            (r.dprt ? (" - " + r.dprt) : "") +
            (r.work ? (" (" + r.work + ")") : ""),
        description: r.tel.toString()
    })
    )
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
        "py": [
            pinyin(conInfoArray[0], optPinYin).replace(/ /g, ""),
            pinyin(conInfoArray[1], optPinYin).replace(/ /g, "",),
            pinyin(conInfoArray[0], optPY).replace(/ /g, ""),
            pinyin(conInfoArray[1], optPY).replace(/ /g, "")
        ]
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

    console.log(vCards)

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

window.exports = {
    'list_contact': {
        mode: 'list',
        args: {
            placeholder: "输入姓名 电话 公司 部门",
            enter: (action, callbackSetList) => {
                //show
                return callbackSetList(dbAllShow)
            },
            search: (action, searchWord, callbackSetList) => {
                // utools.showNotification('list+enter' + code + type + payload)
                if (!searchWord) {
                    return callbackSetList(dbAllShow)
                }
                // show query
                return callbackSetList(getContactList(searchWord))
            },
            select: (action, itemData) => {
                utools.copyText(
                    '详情：' + itemData.title + '\n' +
                    '联系方式：' + itemData.description
                )
                utools.showNotification('详情已复制到剪贴板')
                utools.hideMainWindow()
            }
        }
    },
    'new_list': {
        mode: "list",
        args: {
            placeholder: "请选择导入模式",
            enter: ({ code, type, payload }, callbackSetList) => {
                return callbackSetList(
                    [
                        {
                            title: '导入',
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
                payload = itemData.payload.pop()
                utools.showNotification('开始导入: ' + (payload.name) + '，完成后将提示，请稍候')
                if (itemData.delBefore) {
                    allDoc.forEach(e => {
                        utools.dbStorage.removeItem(e._id)
                    })
                    utools.dbStorage.setItem('info/nowRows', 0)
                }
                utools.hideMainWindow()

                fs.readFile(payload.path, (err, data) => {
                    if (err) {
                        utools.showNotification('read fail')
                        utools.copyqueryText(err)
                        return
                    }
                    var ext = payload.name.split('.').pop().toLowerCase()
                    // utools.showNotification(ext)
                    if (ext === 'csv') {
                        var [total, totalRowInDb] = parseCSV(data.toString())
                    } else if (ext === 'vcf') {
                        var [total, totalRowInDb] = parseVCF(parseVCards(data.toString()))
                    }
                    initDB()
                    utools.showNotification('导入' + total + '条，目前共有' +
                        totalRowInDb + '条，点击查看', 'list_contact')
                })
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
