# Company Card UI Notes

- **Sector chips**
  - `F` = Fertilizers
  - `P` = Crop protection
  - `F&P` = Both (also used for unknown/all to avoid showing “ALL”)

- **Bars and colors**
  - Verified Disclosures (color `#435f74`): percent of all disclosures/snippets that are FULL or PARTIAL.
  - Financially-related Disclosures (color `#b6b740`): percent of all disclosures/snippets that include financial detail (Financial or Partial-type).

- **Tooltips (definitions on the card)**
  - Verified Disclosures: “Percent of all verified disclosures (FULL or PARTIAL) out of every disclosure identified for this company-year.”
  - Financially-related Disclosures: “Percent of all disclosures that include financial detail (Financial or Partial-type), calculated out of 100% of disclosures.”

- **Examples (from FMC in the UI)**
  - Verified Disclosures: 47 of 62 total disclosures → ~76%.
  - Financially-related Disclosures: ~20 of 62 total disclosures → ~32% (this is 32% of all disclosures, not of the 76% verified).

- **Copy updates**
  - “Snippets” renamed to “Disclosures” on the home cards and hero.
  - Bars retitled to “Verified Disclosures” and “Financially-related Disclosures” with inline ⓘ tooltips.

- **Logo placement**
  - Planet Tracker logo displayed in the header, sourced from `/planet_tracker_logo.jfif` with base path support via `import.meta.env.BASE_URL`.
