# Skill Swap Platform

A full-stack web application built with the PERN stack (PostgreSQL, Express.js, React, Node.js) that enables users to exchange skills with each other in a community-driven platform.

## Features

### User Features
- **User Registration & Authentication**: Secure sign-up and login with JWT tokens
- **Profile Management**: Users can create and manage their profiles with:
  - Basic info (name, location, profile photo)
  - Skills offered and skills wanted
  - Availability schedule
  - Public/private profile settings
- **Skill Discovery**: Browse and search for users by skills
- **Swap Requests**: Create, manage, and respond to skill exchange requests
- **Feedback System**: Rate and review completed skill exchanges
- **Real-time Dashboard**: View statistics and recent activity

### Admin Features
- **User Management**: View, ban/unban users
- **Skill Moderation**: Approve/reject new skill submissions
- **Platform Monitoring**: Track swap requests and user activity
- **System Messages**: Send platform-wide announcements
- **Analytics & Reports**: Generate user activity and feedback reports

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Express Validator** - Input validation
- **Helmet** - Security headers

### Frontend
- **React** - UI library
- **Material-UI** - Component library
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Yup** - Form validation

## Project Structure

```
skill-swap-platform/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── database/
│   │   └── schema.sql
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── skills.js
│   │   ├── swaps.js
│   │   └── admin.js
│   ├── uploads/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   └── ProtectedRoute.js
│   │   ├── contexts/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── LandingPage.js
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── ProfilePage.js
│   │   │   ├── BrowseUsersPage.js
│   │   │   ├── SwapRequestsPage.js
│   │   │   ├── UserProfilePage.js
│   │   │   └── AdminDashboard.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── ...
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd skill-swap-platform
   ```

2. **Set up the database**
   ```bash
   # Create a PostgreSQL database
   createdb skill_swap_db
   
   # Run the schema
   psql skill_swap_db < backend/database/schema.sql
   ```

3. **Configure environment variables**
   ```bash
   # Navigate to backend directory
   cd backend
   
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your database credentials and settings
   nano .env
   ```

   Update the following variables in `.env`:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=skill_swap_db
   DB_USER=your_username
   DB_PASSWORD=your_password
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

4. **Install backend dependencies**
   ```bash
   # In the backend directory
   npm install
   ```

5. **Install frontend dependencies**
   ```bash
   # Navigate to frontend directory
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   # In the backend directory
   npm run dev
   ```
   The backend will run on `http://localhost:5000`

2. **Start the frontend application**
   ```bash
   # In the frontend directory (new terminal)
   npm start
   ```
   The frontend will run on `http://localhost:3000`

### Demo Accounts

For testing purposes, you can create demo accounts or use the following credentials (after creating them manually):

- **Regular User**: user@demo.com / password123
- **Admin User**: admin@demo.com / password123

## Database Schema

The application uses a relational database with the following main tables:

- **users**: User accounts and profiles
- **skills**: Available skills in the platform
- **skill_categories**: Skill categorization
- **user_skills**: Junction table for user-skill relationships
- **swap_requests**: Skill exchange requests
- **swap_feedback**: Ratings and reviews
- **admin_messages**: Platform announcements

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Users
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/profile/photo` - Upload profile photo
- `GET /api/users/browse` - Browse public users
- `GET /api/users/:id` - Get user profile
- `GET /api/users/search/:skill` - Search users by skill

### Skills
- `GET /api/skills/categories` - Get skill categories
- `GET /api/skills` - Get all skills
- `POST /api/skills` - Add new skill
- `GET /api/skills/my-skills` - Get user's skills
- `POST /api/skills/my-skills` - Add skill to user
- `PUT /api/skills/my-skills/:id` - Update user skill
- `DELETE /api/skills/my-skills/:id` - Remove user skill

### Swaps
- `POST /api/swaps` - Create swap request
- `GET /api/swaps/my-requests` - Get user's swap requests
- `PUT /api/swaps/:id/status` - Update swap status
- `PUT /api/swaps/:id/complete` - Mark swap as completed
- `DELETE /api/swaps/:id` - Cancel swap request
- `POST /api/swaps/:id/feedback` - Submit feedback

### Admin
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/ban` - Ban/unban user
- `GET /api/admin/skills/pending` - Get pending skills
- `PUT /api/admin/skills/:id/approve` - Approve/reject skill
- `POST /api/admin/messages` - Create admin message
- `GET /api/admin/reports` - Generate reports

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please open an issue in the GitHub repository.