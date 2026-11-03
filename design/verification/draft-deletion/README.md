Synthetic draft deletion regression, November 3 2026. No real accounts, provider calls or client writes.

The fixture seeds a November 12 birthday with 100 guests and an example venue, then simulates a server version conflict. Deleting must refresh the version, confirm removal, clear the event fields and generate a greeting saying nothing filled in yet.

Open /design/verification/draft-deletion/ and a second tab at the same path with ?viewer=1. Delete in the first. Verified both tabs clear their fields and voice greeting context, including when saves were blocked by a conflict. deleted.png captures the second tab after deletion.
