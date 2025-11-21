#!/bin/bash

# Script to save the generated IDL to a file
# This ensures the IDL with "Sealevel Studios" metadata is preserved

set -e

PROGRAM_DIR="programs/attestation-program"
IDL_OUTPUT_DIR="$PROGRAM_DIR/target/idl"
IDL_FILE="$IDL_OUTPUT_DIR/sealevel_attestation.json"

echo "📝 Saving IDL to file..."

# Ensure we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Create IDL directory if it doesn't exist
mkdir -p "$IDL_OUTPUT_DIR"

# Generate IDL and save to file
cd "$PROGRAM_DIR"

echo "🔨 Generating IDL..."
anchor idl build 2>&1 | tee /tmp/anchor-idl-output.log

# Extract JSON from the output (the IDL is printed to stdout)
echo "💾 Extracting IDL JSON..."
# The IDL JSON starts after compilation messages
# Look for the JSON object in the output
grep -A 1000 '^{' /tmp/anchor-idl-output.log | grep -B 1000 '^}$' | head -200 > "$IDL_FILE" 2>/dev/null || {
    # Alternative: try to extract JSON from the full output
    python3 -c "
import json
import sys
import re

# Read the log file
with open('/tmp/anchor-idl-output.log', 'r') as f:
    content = f.read()

# Try to find JSON object
# Look for the start of JSON (after compilation)
json_start = content.find('{')
if json_start != -1:
    # Find matching closing brace
    brace_count = 0
    json_end = json_start
    for i, char in enumerate(content[json_start:], json_start):
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                json_end = i + 1
                break
    
    json_str = content[json_start:json_end]
    try:
        # Validate JSON
        json_obj = json.loads(json_str)
        # Pretty print
        print(json.dumps(json_obj, indent=2))
    except:
        print('Failed to parse JSON', file=sys.stderr)
        sys.exit(1)
else:
    print('No JSON found in output', file=sys.stderr)
    sys.exit(1)
" > "$IDL_FILE" 2>/dev/null || {
    echo "⚠️  Could not extract JSON automatically. IDL was generated but may need manual extraction."
    echo "📋 Check the output above for the JSON IDL"
    exit 0
}
}

# Validate the JSON file
if [ -f "$IDL_FILE" ] && [ -s "$IDL_FILE" ]; then
    # Check if it's valid JSON
    if python3 -m json.tool "$IDL_FILE" > /dev/null 2>&1; then
        echo "✅ IDL saved successfully to: $IDL_FILE"
        echo ""
        echo "📋 IDL Metadata:"
        python3 -c "
import json
with open('$IDL_FILE', 'r') as f:
    idl = json.load(f)
    if 'metadata' in idl:
        print(f\"  Name: {idl['metadata'].get('name', 'N/A')}\")
        print(f\"  Description: {idl['metadata'].get('description', 'N/A')}\")
        print(f\"  Repository: {idl['metadata'].get('repository', 'N/A')}\")
" 2>/dev/null || echo "  (Could not parse metadata)"
    else
        echo "⚠️  Saved file exists but may not be valid JSON"
    fi
else
    echo "❌ Failed to save IDL file"
    exit 1
fi

cd - > /dev/null

echo ""
echo "✅ Done! IDL is ready for Solscan."
echo "📍 Location: $IDL_FILE"

