const fs=require('fs')
const {parseVCards}=require('..')

console.log('This is the test of batch csv.')

const text=fs.readFileSync('./test/sample_batch.vcf').toString()

var cards=parseVCards(text)
var json=JSON.stringify(cards,null,2)

fs.writeFileSync('./test/vcf_batch.json',json)

console.log(json)


