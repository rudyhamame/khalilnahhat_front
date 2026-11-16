// Format complete Canadian/NANP numbers without changing incomplete or international input.
export function formatCanadianPhone(value) {
  const text=String(value??'');
  if(!/^[\d\s()+.\-]*$/.test(text))return text;
  let digits=text.replace(/\D/g,'');
  if(digits.length===11&&digits.startsWith('1'))digits=digits.slice(1);
  else if(text.trim().startsWith('+'))return text;
  if(digits.length!==10)return text;
  return `+1 (${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
}

// Partial values use the same layout as the completed number.
export function formatCanadianPhoneInput(value){
 const text=String(value??'');
 if(!/^[\d\s()+.\-]*$/.test(text))return text;
 let digits=text.replace(/\D/g,'');
 if(!digits)return '';
 if(text.trim().startsWith('+')&&!digits.startsWith('1'))return text;
 if(digits.startsWith('1'))digits=digits.slice(1);
 digits=digits.slice(0,10);
 if(!digits)return '+1';
 let result=`+1 (${digits.slice(0,3)}`;
 if(digits.length>3)result+=`) ${digits.slice(3,6)}`;
 if(digits.length>6)result+=`-${digits.slice(6)}`;
 return result;
}

export function formatCanadianPhoneEdit(previous,raw,selection,inputType){
 let cursor=selection??raw.length;
 // Backspace/Delete on a separator removes the adjacent digit as well.
 if(inputType?.startsWith('delete')&&raw!==previous&&raw.replace(/\D/g,'')===previous.replace(/\D/g,'')){
  const backward=inputType==='deleteContentBackward';
  let index=backward?cursor-1:cursor;
  while(index>=0&&index<raw.length&&!/\d/.test(raw[index]))index+=backward?-1:1;
  if(index>=0&&index<raw.length){raw=raw.slice(0,index)+raw.slice(index+1);if(index<cursor)cursor--;}
 }
 const count=(raw.slice(0,cursor).match(/\d/g)||[]).length;
 let value=formatCanadianPhoneInput(raw);
 if(inputType?.startsWith('delete')&&value==='+1')value='';
 // Ignore the automatically inserted country digit when mapping a national input caret.
 const addedCountry=value.startsWith('+1')&&!raw.replace(/\D/g,'').startsWith('1');
 let remaining=count+(addedCountry?1:0),caret=0;
 while(caret<value.length&&remaining>0){if(/\d/.test(value[caret]))remaining--;caret++;}
 return {value,caret};
}
