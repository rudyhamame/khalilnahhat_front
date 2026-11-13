// The greeting viewport's loader: a spinning vinyl with a gold label and a small equaliser, shown until the character frames are ready.
// No text: the picture (record + character) then appears together.
export default function HeroLoader({label='Loading'}){
  return <div className="hero-loader" role="status" aria-label={label}>
    <div className="hero-loader-disc" aria-hidden="true"><i className="hero-loader-label"/><i className="hero-loader-hole"/></div>
    <div className="hero-loader-eq" aria-hidden="true"><b/><b/><b/><b/><b/></div>
  </div>;
}
