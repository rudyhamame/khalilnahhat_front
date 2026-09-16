function Footer({ items, artistName, mark, message, bookingEmail }) {
  return (
    <footer className="site-footer">
      <div>
        <p className="brand-mark">{mark}</p>
        <h2>{artistName}</h2>
        <p>{message}</p>
        <p>BUILT FOR THE ROOM.</p>
      </div>
      <nav aria-label="Footer">
        {items.map((item) => (
          <a key={item.id} href={item.href || `/${item.id}`}>
            {item.label}
          </a>
        ))}
      </nav>
      <div>
        <p>{bookingEmail}</p>
        <p>&copy; {new Date().getFullYear()} Khalil Nahhat</p>
        <a href="/">Back to intro</a>
      </div>
    </footer>
  );
}

export default Footer;
