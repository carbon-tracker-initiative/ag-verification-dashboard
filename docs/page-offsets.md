# PDF Page Offset Handling

When evidence snippets link to multi-page PDFs, the `#page=` fragment must point to the physical page index inside the file. Some report PDFs restart their printed numbering after front-matter (e.g., roman numerals), so the snippet metadata (which often uses the printed number) can be off by a consistent amount. Use the process below to measure and correct those offsets.

## 1. Detecting Offsets

1. Install the helper dependency once: `pip install pypdf`.
2. Run a quick check for a specific company/year by piping this snippet in the repo root:

   ```powershell
   @'
   import json, re
   from pathlib import Path
   from pypdf import PdfReader

   DATA = Path('results/merged/Scotts Miracle-Gro_2024_merged_2-5-pro_07-11-2025_18-22-27.json')
   PDF = Path('public/source_documents/Scotts Miracle-Gro/2024/WEB FINAL- SMG ANNUAL REPORT (1).pdf')

   def norm(text): return ' '.join((text or '').lower().split())

   reader = PdfReader(PDF)
   pages = [norm(p.extract_text()) for p in reader.pages]
   data = json.loads(DATA.read_text())
   pattern = re.compile(r'page\\s+(\\d+)', re.I)

   offsets = []
   for question in data['analysis_results']:
       for snippet in question['disclosures']:
           source = snippet.get('source') or snippet.get('page') or ''
           if PDF.name not in source:
               continue
           match = pattern.search(source)
           if not match:
               continue
           reported = int(match.group(1))
           quote = norm(snippet.get('quote') or snippet.get('text') or '')
           words = ' '.join(quote.split()[:30])
           for idx, page_text in enumerate(pages):
               if words and words in page_text:
                   offsets.append(idx + 1 - reported)
                   break

   if offsets:
       offsets.sort()
       median = offsets[len(offsets) // 2]
       print(f'Median offset: {median} pages')
   else:
       print('No matches found')
   '@ | python -
   ```

   - A positive median means the actual PDF page is later than the reported number (e.g., a `+3` offset when three unnumbered pages precede Chapter 1).
   - Repeat for each PDF that users report as misaligned.

## 2. Applying Corrections

1. Record the offsets in a small lookup map such as `src/data/pageOffsets.json` using the tuple `(company, year, filename)` as the key and the measured integer as the value.
2. Update `SourceLink` (or whichever helper composes the `#page=` fragment) to read the map and add the offset before generating the anchor:

   ```ts
   const offset = pageOffsets[company]?.[year]?.[filename] ?? 0;
   const adjustedPage = Math.max(1, parsed.page + offset);
   const href = `${basePath}#page=${adjustedPage}`;
   ```

3. Rebuild the site and spot-check the affected links in both dev (`npm run dev`) and the deployed environment to confirm the anchors land on the correct pages.

## 3. Preventing Future Offsets

- If you control the data pipeline, store the absolute PDF page index (or the offset) alongside each snippet when it is generated.
- Encourage contributors to run the detection script whenever they ingest a new PDF that contains lengthy front-matter or a different numbering scheme.

Keeping a documented offset map ensures that the dashboard links stay accurate even when PDFs mix roman numerals with Arabic page numbers.
