#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Column mapping aliases
const MAP = {
    spanish: ["spanish", "es", "word", "term", "sp", "palabra"],
    english: ["english", "en", "translation", "meaning", "def"],
    category: ["category", "topic", "type", "group", "theme"],
    pronunciation: ["pronunciation", "phonetic", "pron"],
    example: ["example", "sentence", "usage"]
};

/**
 * Find which CSV column maps to our field
 */
function detectColumn(headers, fieldAliases) {
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());
    for (const alias of fieldAliases) {
        const index = lowerHeaders.indexOf(alias.toLowerCase());
        if (index !== -1) return headers[index];
    }
    return null;
}

/**
 * Generate ID from spanish word
 */
function generateId(spanish) {
    return spanish
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents for ID
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

/**
 * Main converter function
 */
function convertCsvToJson() {
    const csvPath = path.join(__dirname, '..', 'words.csv');
    const jsonPath = path.join(__dirname, '..', 'src', 'data', 'words.json');

    console.log('📖 Reading CSV file...');

    // Read CSV file as raw bytes and decode properly
    let csvBuffer;
    try {
        csvBuffer = fs.readFileSync(csvPath);
    } catch (err) {
        console.error('❌ Error reading CSV file:', err.message);
        process.exit(1);
    }

    // Try to detect and handle encoding
    let csvContent;

    // Check for UTF-8 BOM
    if (csvBuffer[0] === 0xEF && csvBuffer[1] === 0xBB && csvBuffer[2] === 0xBF) {
        console.log('   Detected UTF-8 with BOM');
        csvContent = csvBuffer.slice(3).toString('utf-8');
    }
    // Check for UTF-16 LE BOM
    else if (csvBuffer[0] === 0xFF && csvBuffer[1] === 0xFE) {
        console.log('   Detected UTF-16 LE');
        csvContent = csvBuffer.slice(2).toString('utf16le');
    }
    // Assume UTF-8 without BOM
    else {
        csvContent = csvBuffer.toString('utf-8');
    }

    // Parse CSV
    let records;
    try {
        records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true
        });
    } catch (err) {
        console.error('❌ Error parsing CSV:', err.message);
        process.exit(1);
    }

    if (records.length === 0) {
        console.error('❌ CSV file is empty');
        process.exit(1);
    }

    // Detect column mappings
    const headers = Object.keys(records[0]);
    const columnMapping = {
        spanish: detectColumn(headers, MAP.spanish),
        english: detectColumn(headers, MAP.english),
        category: detectColumn(headers, MAP.category),
        pronunciation: detectColumn(headers, MAP.pronunciation),
        example: detectColumn(headers, MAP.example)
    };

    console.log('\n🔍 Detected column mappings:');
    console.log(`   Spanish       → ${columnMapping.spanish || '(not found)'}`);
    console.log(`   English       → ${columnMapping.english || '(not found)'}`);
    console.log(`   Category      → ${columnMapping.category || '(not found, will use "General")'}`);
    console.log(`   Pronunciation → ${columnMapping.pronunciation || '(not found, will omit)'}`);
    console.log(`   Example       → ${columnMapping.example || '(not found, will omit)'}`);

    if (!columnMapping.spanish || !columnMapping.english) {
        console.error('\n❌ Required columns (Spanish and English) not found!');
        console.error('   Available headers:', headers.join(', '));
        process.exit(1);
    }

    // Convert records
    const words = [];
    let skipped = 0;
    const seenIds = new Set();

    records.forEach((record, index) => {
        const spanish = record[columnMapping.spanish]?.trim();
        const english = record[columnMapping.english]?.trim();

        // Skip if missing required fields
        if (!spanish || !english) {
            skipped++;
            return;
        }

        // Generate unique ID
        let id = generateId(spanish);
        if (seenIds.has(id)) {
            // Make ID unique by appending number
            let counter = 2;
            while (seenIds.has(`${id}-${counter}`)) {
                counter++;
            }
            id = `${id}-${counter}`;
        }
        seenIds.add(id);

        // Build word object
        const word = {
            id,
            spanish,
            english,
            category: record[columnMapping.category]?.trim() || 'General'
        };

        // Include pronunciation if it exists and is non-empty
        if (columnMapping.pronunciation) {
            const pron = record[columnMapping.pronunciation]?.trim();
            if (pron) {
                word.pronunciation = pron;
            }
        }

        // Only include example if it exists and is non-empty
        if (columnMapping.example) {
            const example = record[columnMapping.example]?.trim();
            if (example) {
                word.example = example;
            }
        }

        words.push(word);
    });

    // Write JSON file with proper UTF-8 encoding (no BOM)
    try {
        const jsonContent = JSON.stringify(words, null, 2);
        fs.writeFileSync(jsonPath, jsonContent, { encoding: 'utf8' });
    } catch (err) {
        console.error('❌ Error writing JSON file:', err.message);
        process.exit(1);
    }

    // Print summary
    console.log('\n✅ Conversion complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   Rows read:    ${records.length}`);
    console.log(`   Rows written: ${words.length}`);
    console.log(`   Rows skipped: ${skipped}`);
    console.log(`\n📁 Output: ${jsonPath}`);

    // Count words with pronunciation
    const withPron = words.filter(w => w.pronunciation).length;
    console.log(`\n🎤 Pronunciation: ${withPron}/${words.length} words have pronunciation`);

    // Sample some words with accents to verify
    const accentedWords = words.filter(w => /[áéíóúüñ]/i.test(w.spanish)).slice(0, 5);
    if (accentedWords.length > 0) {
        console.log('\n✓ Sample accented words:');
        accentedWords.forEach(w => console.log(`   ${w.spanish} → ${w.english}`));
    }

    // Show category breakdown
    const categories = {};
    words.forEach(w => {
        categories[w.category] = (categories[w.category] || 0) + 1;
    });

    console.log(`\n📚 Categories (${Object.keys(categories).length} total):`);
    Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([cat, count]) => {
            console.log(`   ${cat.padEnd(20)} ${count} words`);
        });
    console.log('   ...');
}

// Run converter
convertCsvToJson();
