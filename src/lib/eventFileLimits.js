// What a client may attach to a booking: inspiration photos and event documents, nothing else.
// The same limits apply in the Echo AI conversation and in the References section; the back end enforces the size and the file type again.
export const EVENT_FILE_LIMITS={
 photo:{field:'photos',max:10,bytes:8*1024*1024,mb:8,accept:'image/jpeg,image/png,image/webp',types:['image/jpeg','image/png','image/webp'],name:'Inspiration photos',nameAr:'صور ملهمة'},
 file:{field:'files',max:5,bytes:10*1024*1024,mb:10,accept:'application/pdf,.doc,.docx,.txt',types:['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'],name:'Event documents',nameAr:'مستندات الفعالية'},
};
// '' when the file may be added, otherwise a plain sentence saying why not.
export function checkEventFile(file,kind,count,ar=false){
 const limit=EVENT_FILE_LIMITS[kind],tr=(en,arabic)=>ar?arabic:en;
 if(!limit)return tr('Unknown file type.','نوع ملف غير معروف.');
 if(count>=limit.max)return tr(`You can add up to ${limit.max} ${limit.name.toLowerCase()}. Remove one to add another.`,`يمكنك إضافة ${limit.max} ${limit.nameAr} كحد أقصى. احذف واحداً لإضافة آخر.`);
 if(!file)return tr('Choose a file.','اختر ملفاً.');
 if(file.size>limit.bytes)return tr(`“${file.name}” is too large. ${limit.name} can be up to ${limit.mb} MB each.`,`الملف «${file.name}» كبير جداً. الحد الأقصى ${limit.mb} ميغابايت لكل ملف.`);
 if(file.size<=0)return tr(`“${file.name}” is empty.`,`الملف «${file.name}» فارغ.`);
 const known=limit.types.includes(file.type)||(kind==='file'&&/\.(docx?|txt|pdf)$/i.test(file.name));
 if(!known)return kind==='photo'?tr('Photos must be JPG, PNG or WebP.','يجب أن تكون الصور بصيغة JPG أو PNG أو WebP.'):tr('Documents must be PDF, Word (DOC, DOCX) or TXT.','يجب أن تكون المستندات PDF أو Word (DOC وDOCX) أو TXT.');
 return '';
}
