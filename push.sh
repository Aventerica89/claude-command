#!/bin/bash
set -e

echo "🚀 Pushing claude-command to GitHub..."

# Add remote
git remote add origin https://github.com/Aventerica89/claude-command.git

# Push to main branch
git push -u origin main

echo ""
echo "✅ SUCCESS! Repository pushed to GitHub"
echo ""
echo "🌐 View your repo at:"
echo "   https://github.com/Aventerica89/claude-command"
echo ""
echo "📝 Next steps:"
echo "   1. View the interactive demo:"
echo "      https://github.com/Aventerica89/claude-command/blob/main/demo/mc3-dashboard-demo.html"
echo "   2. Read the setup guide:"
echo "      https://github.com/Aventerica89/claude-command/blob/main/SETUP.md"
echo "   3. Star the repo! ⭐"
