# Use the official Python 3.12 image from the Docker Hub
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Install system dependencies (required for some Python packages like networkx/tree-sitter if they need compilation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 10000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
