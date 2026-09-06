#!/bin/bash
# Startup script for Codebase RAG Assistant Streamlit app with keep-alive support

set -e

echo "======================================"
echo "Codebase RAG Assistant - Startup"
echo "======================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Warning: .env file not found"
    echo "Creating .env template..."
    cat > .env << 'EOF'
API_BASE=http://localhost:8000
GROQ_API_KEY=your_groq_api_key
GOOGLE_API_KEY=your_google_api_key
EOF
    echo ".env file created. Please update it with your API keys."
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "API Base URL: $API_BASE"
echo ""
echo "Starting Streamlit app with keep-alive daemon..."
echo "The keep-alive script will ping the backend every 5 minutes to prevent it from sleeping."
echo ""

# Run Streamlit
streamlit run app.py \
    --logger.level=info \
    --client.showErrorDetails=true \
    --server.enableCORS=true \
    --server.enableXsrfProtection=false
