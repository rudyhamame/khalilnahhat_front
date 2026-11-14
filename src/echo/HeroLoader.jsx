// Simple circular loading indicator while the greeting picture is prepared.
export default function HeroLoader({label='Loading'}){
  return <div className="hero-loader" role="status" aria-label={label}>
    <span className="hero-loader-spinner" aria-hidden="true"/>
  </div>;
}
