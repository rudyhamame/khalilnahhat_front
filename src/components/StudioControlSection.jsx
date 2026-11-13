export default function StudioControlSection({step,title,description,aside,children,className=''}){
 return <section className={`studio-control-card ${className}`} aria-label={title}><header className="studio-control-card-heading"><span className="studio-control-step" aria-hidden="true">{step}</span><div><h4>{title}</h4>{description&&<p>{description}</p>}</div>{aside&&<span className="studio-control-card-aside">{aside}</span>}</header><div className="studio-control-card-body">{children}</div></section>;
}
