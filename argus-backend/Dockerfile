# Use official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Install system dependencies (git is required for clone, curl for scanners)
RUN apt-get update && \
    apt-get install -y git curl wget unzip && \
    rm -rf /var/lib/apt/lists/*

# Install Semgrep (SAST)
RUN pip install semgrep

# Install Gitleaks (Secrets)
RUN curl -sSL https://github.com/gitleaks/gitleaks/releases/download/v8.21.2/gitleaks_8.21.2_linux_x64.tar.gz | tar -xz && \
    mv gitleaks /usr/local/bin/

# Install OSV-Scanner (Dependencies)
RUN curl -sSL https://github.com/google/osv-scanner/releases/download/v1.9.0/osv-scanner_linux_amd64 -o /usr/local/bin/osv-scanner && \
    chmod +x /usr/local/bin/osv-scanner

# Copy requirements and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create directories for reports and temp files
RUN mkdir -p reports temp

# Expose the API port
EXPOSE 8000

# Start the application
CMD ["python", "-m", "argus.main"]
