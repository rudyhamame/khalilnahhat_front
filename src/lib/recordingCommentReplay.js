export function commentsAtTime(items,time){
 const position=Math.max(0,Number(time)||0);
 return items.filter(item=>item.atSec<=position).map(item=>({...item,...(item.reply&&item.reply.atSec<=position?{}:{reply:undefined})}));
}
