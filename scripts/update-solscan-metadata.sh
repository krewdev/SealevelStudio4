#!/bin/bash

# Script to update program metadata for Solscan display
# This ensures "Sealevel Studios" appears correctly on Solscan

set -e

echo "🔧 Updating Solscan Metadata for Sealevel Studios..."

PROGRAM_DIR="programs/attestation-program/programs/attestation-program"

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Update Cargo.toml
echo "📝 Updating Cargo.toml metadata..."
cat > "$PROGRAM_DIR/Cargo.toml" << 'CARGO_EOF'
[package]
name = "sealevel-attestation"
version = "0.1.0"
description = "Sealevel Studios - Attestation Program for ZK proof verification and compressed NFT minting"
authors = ["Sealevel Studios"]
edition = "2021"
repository = "https://github.com/sealevelstudio/sealevel-studio"
homepage = "https://sealevel.studio"
documentation = "https://docs.sealevel.studio"
keywords = ["solana", "attestation", "zk-proof", "cnft", "sealevel"]

[lib]
crate-type = ["cdylib", "lib"]
name = "sealevel_attestation"

[features]
default = []
cpi = ["no-entrypoint"]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
idl-build = ["anchor-lang/idl-build"]
anchor-debug = []
custom-heap = []
custom-panic = []

[dependencies]
anchor-lang = "0.32.1"

[lints.rust]
unexpected_cfgs = { level = "warn", check-cfg = ['cfg(target_os, values("solana"))'] }
CARGO_EOF

echo "✅ Cargo.toml updated"

# Update Anchor.toml program name
echo "📝 Updating Anchor.toml..."
if [ -f "programs/attestation-program/Anchor.toml" ]; then
    # Update program name in Anchor.toml
    sed -i.bak 's/attestation_program/sealevel_attestation/g' programs/attestation-program/Anchor.toml
    rm -f programs/attestation-program/Anchor.toml.bak
    echo "✅ Anchor.toml updated"
else
    echo "⚠️  Anchor.toml not found, skipping"
fi

echo ""
echo "✅ Metadata updated for Solscan!"
echo ""
echo "Next steps:"
echo "1. Rebuild: cd programs/attestation-program && anchor build"
echo "2. Check generated IDL: cat target/idl/sealevel_attestation.json"
echo "3. Deploy: anchor deploy --provider.cluster devnet"
echo "4. Verify on Solscan that it shows 'Sealevel Studios'"
echo ""
echo "📚 See docs/SOLSCAN_METADATA.md for more details"

