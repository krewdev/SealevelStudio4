#!/bin/bash

# GPU detection and verification script
# Detects NVIDIA CUDA, Apple Silicon Metal, and provides recommendations

echo "🔍 GPU Detection and Verification"
echo "=================================="
echo ""

GPU_DETECTED=false
GPU_TYPE="none"

# Check for NVIDIA GPU
if command -v nvidia-smi &> /dev/null; then
    echo "✅ NVIDIA GPU detected"
    nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
    GPU_DETECTED=true
    GPU_TYPE="nvidia"
    echo ""
    
    # Check CUDA version
    if command -v nvcc &> /dev/null; then
        CUDA_VERSION=$(nvcc --version | grep "release" | sed 's/.*release \([0-9.]*\).*/\1/')
        echo "   CUDA Version: $CUDA_VERSION"
    fi
    
    # Check Docker GPU support
    if docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi &> /dev/null; then
        echo "   ✅ Docker GPU support: Enabled"
    else
        echo "   ⚠️  Docker GPU support: Not configured"
        echo "      Install NVIDIA Container Toolkit:"
        echo "      https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html"
    fi
    echo ""
fi

# Check for Apple Silicon
if [[ "$OSTYPE" == "darwin"* ]]; then
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
        echo "✅ Apple Silicon (M1/M2/M3) detected"
        GPU_DETECTED=true
        GPU_TYPE="apple-silicon"
        
        # Get chip information
        if command -v sysctl &> /dev/null; then
            CHIP=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Apple Silicon")
            echo "   Chip: $CHIP"
        fi
        
        # Check Metal support
        if [ -d "/System/Library/Frameworks/Metal.framework" ]; then
            echo "   ✅ Metal framework: Available"
        fi
        
        # Check Docker Desktop
        if docker info &> /dev/null; then
            echo "   ✅ Docker Desktop: Running"
            echo "   ℹ️  Metal acceleration is automatic with Docker Desktop"
        else
            echo "   ⚠️  Docker Desktop: Not running"
        fi
        echo ""
    fi
fi

# Check for Intel GPU (less common for AI)
if [[ "$OSTYPE" == "linux-gnu"* ]] && ! $GPU_DETECTED; then
    if lspci | grep -i vga | grep -i intel &> /dev/null; then
        echo "ℹ️  Intel integrated GPU detected (limited AI support)"
        GPU_TYPE="intel"
        echo ""
    fi
fi

# No GPU detected
if [ "$GPU_DETECTED" = false ] && [ "$GPU_TYPE" = "none" ]; then
    echo "⚠️  No GPU detected - will use CPU (slower)"
    echo ""
    echo "Recommendations:"
    echo "  - Use smaller models (phi, mistral:7b)"
    echo "  - Reduce maxTokens in queries"
    echo "  - Consider cloud models for heavy tasks"
    echo ""
    GPU_TYPE="cpu"
fi

# Performance recommendations
echo "💡 Performance Recommendations:"
echo ""

case $GPU_TYPE in
    nvidia)
        echo "  ✅ NVIDIA GPU detected - Excellent for AI inference"
        echo "  Recommended models:"
        echo "    - llama2:7b (4GB VRAM)"
        echo "    - codellama:7b (4GB VRAM)"
        echo "    - llama2:13b (8GB VRAM)"
        echo "    - llama2:70b (40GB VRAM)"
        echo ""
        echo "  Monitor GPU usage: nvidia-smi"
        ;;
    apple-silicon)
        echo "  ✅ Apple Silicon detected - Good for AI inference"
        echo "  Recommended models:"
        echo "    - phi (2GB unified memory)"
        echo "    - mistral:7b (4GB unified memory)"
        echo "    - llama2:7b (4GB unified memory)"
        echo "    - codellama:7b (4GB unified memory)"
        echo ""
        echo "  Monitor memory: Activity Monitor"
        echo "  Note: Unified memory is shared between CPU and GPU"
        ;;
    cpu)
        echo "  ⚠️  CPU-only mode - Limited performance"
        echo "  Recommended models:"
        echo "    - phi (2.7B parameters, ~2GB RAM)"
        echo "    - mistral:7b (7B parameters, ~4GB RAM)"
        echo ""
        echo "  Tips:"
        echo "    - Use smaller models"
        echo "    - Reduce maxTokens"
        echo "    - Consider cloud models for production"
        ;;
esac

# Environment variable suggestion
echo "📝 Suggested .env.local configuration:"
echo ""
echo "  GPU_ENABLED=true"
echo "  GPU_TYPE=$GPU_TYPE"
if [ "$GPU_TYPE" = "nvidia" ]; then
    echo "  # Optional: Set GPU memory limit (MB)"
    echo "  # GPU_MEMORY_LIMIT=8192"
fi
echo ""

exit 0

