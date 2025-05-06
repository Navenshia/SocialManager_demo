# Social Media Manager

A comprehensive social media management application built with React, TypeScript, and Vite. This application allows you to create, schedule, and publish content to multiple social media platforms from a single interface.

## Features

- Create and schedule posts for Instagram, YouTube, and TikTok
- Upload images and videos from your gallery
- Track comments and engagement across platforms
- Manage multiple social media accounts
- Dark mode support
- Responsive design

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router
- **API Integration**: Axios
- **File Storage**: Google Cloud Storage
- **Deployment**: Vercel

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Cloud Platform account (for production)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/social-media-manager.git
   cd social-media-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Configure environment variables in the `.env` file:
   ```
   VITE_GCS_PROJECT_ID=your-project-id
   VITE_GCS_BUCKET_NAME=your-bucket-name
   VITE_GCS_KEY_FILE=path/to/your-service-account-key.json
   ```

### Google Cloud Storage Setup (for Production)

1. Create a Google Cloud Platform project
2. Enable the Cloud Storage API
3. Create a storage bucket
4. Configure CORS for the bucket:
   ```json
   [
     {
       "origin": ["https://your-app-domain.com", "http://localhost:5173"],
       "method": ["GET", "POST", "PUT"],
       "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
5. Create a service account with Storage Admin role
6. Generate a JSON key for the service account
7. Save the key file in a secure location
8. Update the `.env` file with the correct values

### Development Mode

Run the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at http://localhost:5173

### Production Build

Create a production build:

```bash
npm run build
# or
yarn build
```

Preview the production build:

```bash
npm run preview
# or
yarn preview
```

### Deployment to Vercel

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy to Vercel:
   ```bash
   vercel
   ```

3. Add environment variables in the Vercel dashboard:
   - VITE_GCS_PROJECT_ID
   - VITE_GCS_BUCKET_NAME
   - VITE_GCS_KEY_FILE (for Vercel, you'll need to encode the JSON key file as a string)
