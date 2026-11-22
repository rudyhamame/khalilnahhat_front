const ISO_COUNTRY_CODES='AW AF AO AI AX AL AD AE AR AM AS AQ TF AG AU AT AZ BI BE BJ BQ BF BD BG BH BS BA BL BY BZ BM BO BR BB BN BT BV BW CF CC CH CL CN CI CM CD CG CK CO KM CV CR CU CW CX KY CY CZ DE DJ DM DK DO DZ EC EG ER EH ES EE ET FI FJ FK FR FO FM GA GB GE GG GH GI GN GP GM GW GQ GR GD GL GT GF GU GY HK HM HN HR HT HU ID IM IN IO IE IR IQ IS IL IT JM JE JO JP KZ KE KG KH KI KN KR KW LA LB LR LY LC LI LK LS LT LU LV MO MF MA MC MD MG MV MX MH MK ML MT MM ME MN MP MZ MR MS MQ MU MW MY YT NA NC NE NF NG NI NU NL NO NP NR NZ OM PK PA PN PE PH PW PG PL PR KP PT PY PS PF QA RE RO RU RW SA SD SN SG GS SH SJ SB SL SV SM SO PM RS SS ST SR SK SI SZ SE SX SC SY TC TD TG TH TJ TK TM TL TO TT TN TR TV TW TZ UG UA UM UY UZ VA VC VE VG VI VN VU WF WS YE ZA ZM ZW';

export function countryOptions(ar=false){
 const codes=ISO_COUNTRY_CODES.split(' ').filter(code=>code!=='CA'&&code!=='US');
 const english=new Intl.DisplayNames(['en'],{type:'region'});
 const local=ar?new Intl.DisplayNames(['ar'],{type:'region'}):english;
 const rank=value=>value==='Canada'?0:value==='United States'?1:2;
 return ['CA','US',...codes]
  .map(code=>({value:english.of(code),label:code==='US'&&!ar?'USA':local.of(code)}))
  .sort((a,b)=>rank(a.value)-rank(b.value)||a.value.localeCompare(b.value,'en'));
}
