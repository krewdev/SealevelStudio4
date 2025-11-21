#!/bin/bash

# Simple script to save the IDL JSON to a file

cd programs/attestation-program

# Create IDL directory
mkdir -p target/idl

# Generate IDL and extract JSON
echo "🔨 Generating IDL..."
anchor idl build 2>&1 | grep -A 1000 '^{' | grep -B 1000 '^}$' > target/idl/sealevel_attestation.json

# Check if file was created
if [ -f target/idl/sealevel_attestation.json ]; then
    echo "✅ IDL saved to: target/idl/sealevel_attestation.json"
    echo ""
    echo "📋 Metadata preview:"
    head -15 target/idl/sealevel_attestation.json
else
    echo "⚠️  IDL file not created. The JSON might be in the output above."
fi

