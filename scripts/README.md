# CSV to JSON Converter

## Purpose

Convert Spanish vocabulary from CSV format to the JSON format used by the app.

## Usage

```bash
npm run build:words
```

This reads `./words.csv` and outputs to `./src/data/words.json`.

## CSV Format

The script auto-detects column names using aliases:

- **Spanish**: `spanish`, `es`, `word`, `term`, `sp`, `palabra`
- **English**: `english`, `en`, `translation`, `meaning`, `def`
- **Category**: `category`, `topic`, `type`, `group`, `theme`
- **Example**: `example`, `sentence`, `usage`

### Required Columns
- Spanish
- English

### Optional Columns
- Category (defaults to "General" if missing)
- Example (omitted if missing or empty)

## Output Format

```json
[
  {
    "id": "amor",
    "spanish": "amor",
    "english": "love",
    "category": "Abstract"
  }
]
```

The `id` is auto-generated from the Spanish word (lowercase, trimmed, spaces replaced with dashes).

## Features

✅ Auto-detects column mappings  
✅ Skips rows with missing Spanish or English  
✅ Trims whitespace from all fields  
✅ Only includes examples if present in CSV  
✅ Provides detailed summary with category breakdown  

## Example Output

```
📖 Reading CSV file...

🔍 Detected column mappings:
   Spanish  → Spanish
   English  → English
   Category → Category
   Example  → (not found, will omit)

✅ Conversion complete!

📊 Summary:
   Rows read:    1066
   Rows written: 1066
   Rows skipped: 0

📁 Output: /src/data/words.json

📚 Categories:
   Abstract             198 words
   Adjectives           120 words
   Verbs (Action)       56 words
   ...
```
