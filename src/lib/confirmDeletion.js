import './confirmDeletion.css';

let queue=Promise.resolve();
export function confirmDeletion(message='Delete this item and its uploaded files permanently?',{title:heading='Permanently delete?',confirmLabel='Delete permanently',irreversible=true}={}) {
  const ask=()=>new Promise(resolve=>{
    const previous=document.activeElement;
    const dialog=document.createElement('dialog');
    dialog.className='permanent-delete-confirmation';
    dialog.setAttribute('aria-labelledby','permanent-delete-title');
    dialog.setAttribute('aria-describedby','permanent-delete-description');
    const title=document.createElement('h2');title.id='permanent-delete-title';title.textContent=heading;
    const description=document.createElement('p');description.id='permanent-delete-description';description.textContent=message+(irreversible?' This cannot be undone.':'');
    const actions=document.createElement('div');
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
    const remove=document.createElement('button');remove.type='button';remove.className='is-danger';remove.textContent=confirmLabel;
    const finish=value=>{dialog.close();dialog.remove();previous?.focus?.({preventScroll:true});resolve(value);};
    cancel.onclick=()=>finish(false);remove.onclick=()=>finish(true);
    dialog.oncancel=event=>{event.preventDefault();finish(false);};
    actions.append(cancel,remove);dialog.append(title,description,actions);document.body.append(dialog);
    dialog.showModal();cancel.focus();
  });
  const result=queue.then(ask);queue=result.catch(()=>{});return result;
}
