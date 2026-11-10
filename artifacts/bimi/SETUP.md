# DJ Khalil Nahhat BIMI setup

Prepared 2026-11-09. The inbox logo is not activated yet: Gmail requires an issued VMC or CMC certificate.

## Ready

- Public logo path: `/bimi/logo.svg`.
- Square 1000 × 1000 canvas, solid #0d1418 background, white DJ Khalil Nahhat mark.
- Converted from the site's existing raster-backed logo to vector-only paths; review `logo-preview.png` before submitting it for certification.
- SVG Tiny Portable/Secure 1.2; 28,607 bytes, no fonts, bitmap images, scripts or external references.
- Validated against the BIMI Group's SVG P/S RNC schema at https://bimigroup.org/resources/SVG_PS-latest.rnc.txt.
- Brevo dashboard confirmed `djkhalilnahhat.ca` is Authenticated, and both Echo Bookings and Echo Event Entertainment senders are Verified.
- Existing DMARC is `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s`. Keep it in place.

## Certificate required

An issuer must verify the organization, domain and logo. A VMC requires an eligible registered trademark. A CMC has separate prior-use requirements. Verify eligibility with the issuer before purchasing; website setup alone does not produce a certificate. Do not generate a self-signed certificate as a substitute.

Google requirements: https://knowledge.workspace.google.com/admin/security/set-up-bimi
Issuer directory: https://bimigroup.org/vmc-issuers/

## Activate only after the certificate is issued

1. Host the issuer's complete public PEM chain at `https://djkhalilnahhat.ca/bimi/certificate.pem` (or use the issuer's supplied hosted certificate URL). Never publish a private key.
2. Confirm the certificate covers the exact logo and domain and both files are publicly accessible over HTTPS.
3. Create a Cloudflare TXT record named `default._bimi` with TTL Auto:

   `v=BIMI1; l=https://djkhalilnahhat.ca/bimi/logo.svg; a=https://djkhalilnahhat.ca/bimi/certificate.pem;`

   This is a pending template, not a record to publish before the certificate exists. Replace the `a=` URL if using issuer hosting.
4. Run the BIMI Group validator, then send one authorized test and inspect the receiving mailbox. Provider display remains subject to provider policies.
5. Track certificate expiry and renew before expiration.

No certificate was purchased and no BIMI DNS record was added during preparation.
