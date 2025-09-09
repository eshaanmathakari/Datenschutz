# Multi-stage build for Datenschutz VS Code Extension
FROM node:18-alpine AS node-builder

# Install build dependencies
RUN apk add --no-cache python3 py3-pip make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build the extension
RUN npm run compile

# Production stage
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for LLM support
RUN pip install --no-cache-dir \
    flask==3.0.3 \
    flask-cors==4.0.1 \
    python-dotenv==1.0.1 \
    llama-cpp-python==0.2.86 \
    transformers==4.42.4 \
    torch \
    accelerate==0.33.0 \
    sentencepiece==0.2.0 \
    safetensors==0.4.3 \
    orjson==3.10.7 \
    rapidfuzz==3.9.6

# Create app directory
WORKDIR /app

# Copy built extension from node-builder stage
COPY --from=node-builder /app/out ./out
COPY --from=node-builder /app/package.json ./

# Copy Python backend from original project
COPY ../analyzer/ ./analyzer/

# Create directories for logs and models
RUN mkdir -p /app/fix_logs /app/models /app/.datenschutz_backups

# Set environment variables
ENV PYTHONPATH=/app
ENV MODEL_BACKEND=none
ENV DEFAULT_SCAN_PATH=/workspace
ENV LOG_RETENTION_DAYS=14

# Create a non-root user
RUN useradd -m -u 1000 vscode && \
    chown -R vscode:vscode /app
USER vscode

# Expose port for the web interface (if needed)
EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "import sys; sys.exit(0)"

# Default command
CMD ["node", "out/extension.js"]
