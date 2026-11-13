import BookingCart from './BookingCart';

// The section buttons moved to the app header (HeaderNav); this keeps only the booking summary mounted.
export default function HomeSectionNav({ar=false}){return <BookingCart ar={ar}/>;}
