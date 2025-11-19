#!/bin/bash

# Pre-publish validation script for VeloQR
# This script checks if the package is ready to be published

set -e

echo "🔍 Pre-Publish Validation Check"
echo "================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any checks fail
FAILED=0

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
    FAILED=1
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "1. Checking Git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Working directory has uncommitted changes"
    git status --short
    echo ""
else
    print_success "Working directory is clean"
fi

echo ""
echo "2. Checking if on main/master branch..."
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    print_success "On $BRANCH branch"
else
    print_warning "Not on main/master branch (currently on: $BRANCH)"
fi

echo ""
echo "3. Checking for required files..."
REQUIRED_FILES=("package.json" "README.md" "LICENSE" "dist/index.js" "dist/index.d.ts" "rust-qr/pkg/veloqr_bg.wasm")

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file exists"
    else
        print_error "$file is missing"
    fi
done

echo ""
echo "4. Checking package.json fields..."

# Check for required package.json fields
check_package_field() {
    local field=$1
    local value=$(node -p "require('./package.json').$field" 2>/dev/null)
    if [ "$value" != "undefined" ] && [ -n "$value" ]; then
        print_success "$field: $value"
    else
        print_error "$field is missing or empty"
    fi
}

check_package_field "name"
check_package_field "version"
check_package_field "description"
check_package_field "main"
check_package_field "types"
check_package_field "author"
check_package_field "license"
check_package_field "repository.url"

echo ""
echo "5. Checking build artifacts..."
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    print_success "dist/ directory exists and is not empty"
    echo "   Files in dist/:"
    ls -lh dist/ | grep -v "^total" | awk '{print "   - " $9 " (" $5 ")"}'
else
    print_error "dist/ directory is missing or empty. Run: npm run build"
fi

if [ -d "rust-qr/pkg" ] && [ -f "rust-qr/pkg/veloqr_bg.wasm" ]; then
    WASM_SIZE=$(ls -lh rust-qr/pkg/veloqr_bg.wasm | awk '{print $5}')
    print_success "WASM module exists ($WASM_SIZE)"
else
    print_error "WASM module is missing. Run: npm run build:wasm"
fi

echo ""
echo "6. Checking package size..."
PACKAGE_SIZE=$(npm pack --dry-run 2>&1 | grep "package size" | awk '{print $3, $4}')
if [ -n "$PACKAGE_SIZE" ]; then
    print_success "Package size: $PACKAGE_SIZE"
else
    print_warning "Could not determine package size"
fi

echo ""
echo "7. Checking npm authentication..."
if npm whoami &>/dev/null; then
    NPM_USER=$(npm whoami)
    print_success "Logged in as: $NPM_USER"
else
    print_error "Not logged in to npm. Run: npm login"
fi

echo ""
echo "================================"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Ready to publish. Run one of:"
    echo "  npm run release:patch  (1.0.0 → 1.0.1)"
    echo "  npm run release:minor  (1.0.0 → 1.1.0)"
    echo "  npm run release:major  (1.0.0 → 2.0.0)"
    echo ""
    echo "Or manually:"
    echo "  npm version patch|minor|major"
    echo "  npm publish"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please fix the issues above.${NC}"
    exit 1
fi
