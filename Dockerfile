FROM nikolaik/python-nodejs:python3.11-nodejs20

# Set working directory
WORKDIR /app

# Copy root package.json for Gateway
COPY package*.json ./
RUN npm install

# Copy backend requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy all project files (ignoring node_modules and venv via .dockerignore if exists)
COPY . .

# Ensure start.sh is executable
RUN chmod +x start.sh

# Render / Railway exposes the web service on the $PORT environment variable.
# Our gateway.js automatically binds to $PORT.
EXPOSE $PORT

# Start all services
CMD ["./start.sh"]
