#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Help message
show_help() {
    cat << EOF
Usage: ./scripts/update-version.sh [VERSION]

Update the package version in package.json

VERSION can be:
  - patch       : Bump patch version (1.0.0 -> 1.0.1)
  - minor       : Bump minor version (1.0.0 -> 1.1.0)
  - major       : Bump major version (1.0.0 -> 2.0.0)
  - x.y.z       : Set specific version (e.g., 1.2.3)
  - prepatch    : Bump patch and add prerelease (1.0.0 -> 1.0.1-0)
  - preminor    : Bump minor and add prerelease (1.0.0 -> 1.1.0-0)
  - premajor    : Bump major and add prerelease (1.0.0 -> 2.0.0-0)
  - prerelease  : Increment prerelease version (1.0.0-0 -> 1.0.0-1)

Options:
  -h, --help    : Show this help message
  --no-build    : Skip build after version update
  --no-commit   : Skip git commit

Examples:
  ./scripts/update-version.sh patch
  ./scripts/update-version.sh 1.2.3
  ./scripts/update-version.sh minor --no-build

EOF
}

# Default options
DO_BUILD=true
DO_COMMIT=false
VERSION_ARG=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --no-build)
            DO_BUILD=false
            shift
            ;;
        --no-commit)
            DO_COMMIT=false
            shift
            ;;
        --commit)
            DO_COMMIT=true
            shift
            ;;
        *)
            VERSION_ARG="$1"
            shift
            ;;
    esac
done

# Check if version argument is provided
if [ -z "$VERSION_ARG" ]; then
    print_error "Version argument is required"
    echo ""
    show_help
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_info "Current version: ${CURRENT_VERSION}"

# Update version using npm version
print_info "Updating version to: ${VERSION_ARG}"

# Run npm version with --no-git-tag-version flag to prevent automatic git tag
if npm version "$VERSION_ARG" --no-git-tag-version >/dev/null 2>&1; then
    NEW_VERSION=$(node -p "require('./package.json').version")
    print_success "Version updated: ${CURRENT_VERSION} → ${NEW_VERSION}"
else
    print_error "Failed to update version"
    exit 1
fi

# Build if requested
if [ "$DO_BUILD" = true ]; then
    print_info "Building project..."
    if npm run build:prod; then
        print_success "Build completed"
    else
        print_error "Build failed"
        exit 1
    fi
fi

# Commit changes if requested
if [ "$DO_COMMIT" = true ]; then
    print_info "Committing version change..."

    # Check if git is available and we're in a git repo
    if command -v git &> /dev/null && git rev-parse --git-dir > /dev/null 2>&1; then
        git add package.json

        if [ "$DO_BUILD" = true ]; then
            git add dist/
        fi

        git commit -m "chore: bump version to ${NEW_VERSION}" 2>/dev/null

        if [ $? -eq 0 ]; then
            print_success "Changes committed"
            print_info "To create a git tag, run: git tag v${NEW_VERSION}"
        else
            print_warning "No changes to commit or commit failed"
        fi
    else
        print_warning "Git not available or not in a git repository"
    fi
fi

print_success "Done! New version: ${NEW_VERSION}"

# Show next steps
echo ""
print_info "Next steps:"
if [ "$DO_BUILD" = false ]; then
    echo "  - Run 'npm run build:prod' to build with new version"
fi
if [ "$DO_COMMIT" = false ]; then
    echo "  - Review changes: git diff package.json"
    echo "  - Commit changes: git add . && git commit -m 'chore: bump version to ${NEW_VERSION}'"
fi
echo "  - Create tag: git tag v${NEW_VERSION}"
echo "  - Publish: npm publish"
