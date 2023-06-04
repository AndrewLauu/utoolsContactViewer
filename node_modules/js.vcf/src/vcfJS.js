/*
 * param:  string : vCard(s) text
 * return: object : vCardObj
 */


const EOL='\r\n'

function parseVCards(vCardsText){
  const vCards=[]

  vCardsText+=EOL
  var vCardsText=vCardsText
    .trim()
    .replace(/\r\n\r\n/g,EOL)


  var vCardsList=vCardsText.split('END:VCARD')

  vCardsList.forEach(c=>{
    if (!c) return
    vCards.push(parseVCard(c))
  })

  return vCards
}


function parseVCard(vCardText){

  // vCard={
  //   N:{
  //     property1:1,
  //     property2:2,
  //     value:3
  //   },
  //   TEL:{
  //     {
  //       property1:1,
  //       property2:2,
  //       value:3
  //       },
  //     {
  //       property1:1,
  //       property2:2,
  //       value:3
  //       },
  //   }...
  // }

  const vCard={}
  //contentline = [group "."] name *(";" param) ":" value CRLF
  // const propName=["SOURCE","KIND","FN","N","NICKNAME","PHOTO","BDAY","ANNIVERSARY","GENDER","ADR","TEL","EMAIL","IMPP","LANG","TZ","GEO","TITLE","ROLE","LOGO","ORG","MEMBER","RELATED","CATEGORIES","NOTE","PRODID","REV","SOUND","UID","CLIENTPIDMAP","URL","KEY","FBURL","CALADRURI","CALURI","XML"]

  const vCardList=vCardText
    .replace(/BEGIN:VCARD/g,'')
    .replace(/\r\n[\x20\x09]/g,'')//unfold
    .replace(/(.)\r\n\1/g,'=')//unfold
    .replace(/\\:/g,'<%escapedCol%>')
    .replace(/\\;/g,'<%escapedSemiCol%>')
    .replace(/\\,/g,'<%escapedSemiCom%>')
    .replace(/\r\n\r\n/g,EOL)
    .trim()
    .split(EOL)

  // const tagExp=new RegExp(
  //   "^"+propName
  //   .map(e=>"("+e+")")
  //   .join("|")+':|;.*?'+EOL+'$','gi')

  for (var i=0;i<vCardList.length;i++){
    var procLine=vCardList[i].trim()
    //unfold line
    // while(i<vCardList.length-1 && !tagExp.test(vCardList[i+1]))
    // { 
    //   i++
    //   procLine=procLine+vCardList[i].trim()
    // }

    //contentline = [group "."] name *(";" param) ":" value CRLF
    var [pnameParam,...value]=procLine.split(':')
    var [pname,...params]=pnameParam.split(';')

    const paramsValue={}

    params.forEach(p=>{
      var [k,v=null]=p.split('=')
      paramsValue[k]=v
    })

    value=value.join(':')
    if (paramsValue['CHARSET'] && paramsValue['CHARSET'].toUpperCase()=="UTF-8"){
      value=value
        .split(';').map(
          np=>np.split(',').map(
          npp=>Buffer.from(
            npp.replace(/=/g,''),'hex')
          .toString()
        ).join(',')
      ).join(';')
    }
    paramsValue.VALUE=value
      .replace(/<%escapedCol%>/g,':')
      .replace(/<%escapedSemiCol%>/g,';')
      .replace(/<%escapedSemiCom%>/g,',')

    if (!vCard[pname]) vCard[pname]=[]
    vCard[pname].push(paramsValue)
  }
  delete vCard.END
  return vCard
}

module.exports ={ 
  parseVCard:parseVCard,
  parseVCards:parseVCards
}
