#!/bin/bash

echo "🚀 Setting up Solar System Explorer Portfolio v2.0..."
echo ""

# Check if resources folder exists
if [ ! -d "resources" ]; then
    echo "📁 Creating resources folder..."
    mkdir -p resources/spaceships
    mkdir -p resources/locales
    echo "✓ Folders created"
fi

# Check for required files
echo ""
echo "📦 Checking required files..."

if [ ! -f "resources/solar_system_real_scale_2k_textures.glb" ]; then
    echo "⚠️  WARNING: solar_system_real_scale_2k_textures.glb not found"
    echo "   Please add this file to resources/"
fi

if [ ! -f "resources/spaceship.glb" ]; then
    echo "⚠️  WARNING: spaceship.glb not found"
    echo "   Please add this file to resources/"
fi

if [ ! -f "resources/project_map.json" ]; then
    echo "📝 Creating default project_map.json..."
    cat > resources/project_map.json << 'EOF'
{
  "Earth": {
    "title": "About Me",
    "short": "Welcome to my interactive portfolio!",
    "long": "This is where you can add detailed information about yourself, your skills, and your journey.",
    "projects": [
      {
        "name": "Sample Project",
        "description": "Add your project description here",
        "tech": "Technologies used",
        "link": "https://github.com/yourusername/project"
      }
    ],
    "contact": {
      "email": "your@email.com",
      "phone": "+1234567890",
      "location": "Your City, Country"
    },
    "links": [
      {"label": "GitHub", "url": "https://github.com/yourusername"},
      {"label": "LinkedIn", "url": "https://linkedin.com/in/yourusername"}
    ]
  }
}
EOF
    echo "✓ Default project_map.json created"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your GLB files to resources/"
echo "2. Customize project_map.json with your content"
echo "3. Start a local server: python -m http.server 8000"
echo "4. Open http://localhost:8000 in your browser"
echo ""
echo "🎮 Enjoy your interactive portfolio!"
