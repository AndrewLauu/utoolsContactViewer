const {parseVCard}=require('..')
const fs=require('fs')

console.log('This is the test of single csv.')

const text=fs.readFileSync('./test/sample_one.vcf').toString()
var cards=parseVCard(text)
var json=JSON.stringify(cards,null,2)

console.log(json)


