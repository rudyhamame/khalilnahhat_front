// Public work-type copy comes only from DJ Work Type in the admin dashboard.
export function djWorkTypeText(work,ar=false){
 return {name:(ar&&work?.nameArabic)||work?.name||'',details:(ar&&work?.detailsArabic)||work?.details||''};
}
