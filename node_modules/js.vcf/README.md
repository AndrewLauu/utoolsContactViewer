# vcfJS
[![npm](https://img.shields.io/npm/v/vcf.svg?style=flat-square)](https://npmjs.com/package/vcfJS)
[![npm license](https://img.shields.io/npm/l/vcf.svg?style=flat-square)](https://npmjs.com/package/vcfJS)
***

[TOC]

## Introduction

This is a simple javascript lib which parses vCard file (AKA \*.vcf) and generate vcf object.

Only support vCard 2.1 version.

## USE

### Install

`npm install vcfJS`

### parse one vCard

```javascript
const fs = require('fs')
const {parseVCard} = require('vcfJS')

const vcfText = fs.readFileSync('/path/to/vcffile.vcf')
var vCard = parseVCard(vcfText)
console.log(vCard.NF[0].VALUE)
console.log(vCard)
```

```javascript
{
    VERSION:2.1,
    N:[
        {
            PROPERTY1:property,
            PROPERTY2:property,
            VALUE:value
        }
    ],
    NF:{...},
    TEL:{...},
    ...
}
```

### parse batch of vCards

```javascript
const fs = require('fs')
const {parseVCards} = require('vcfJS')

const vcfText = fs.readFileSync('/path/to/vcffile.vcf')
var vCards = parseVCard(vcfText)

console.log(vCards)
```

```javascript
[
    vCardObj,
    vCardObj
]
    ```
