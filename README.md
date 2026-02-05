# MyLab Platform

A modern, scalable web application for lab data management, designed to streamline workflows in research and analytical environments. MyLab Platform enables secure, multi-tenant data handling with features like workspace isolation, immutable analysis results, audit trails, and comprehensive testing.

## 🚀 Overview

MyLab Platform is built for laboratories that need robust data integrity, access control, and collaboration tools. Key entities include:
- **Workspaces**: Isolated environments for teams or projects
- **Projects**: Collections of samples and analyses
- **Samples**: Physical or digital specimens under study
- **Batches**: Groups of samples processed together
- **Analyses**: Immutable results with revision tracking
- **Users**: Role-based access (Admin, Manager, Scientist)

The platform ensures data safety through conflict detection, referential integrity, and comprehensive audit logging while providing modern APIs for notifications, pagination, and workspace management.

## ✨ Key Features

- **Data Integrity & Immutability**: Analysis results cannot be directly modified; revisions use `supersedes_id` for tracking
- **Conflict Detection**: Prevents overwriting authoritative analyses
- **Workspace Isolation**: Enforces multi-tenancy with strict access controls
- **Audit Trails**: Logs all changes with actor, workspace, and timestamp details
- **Notifications**: User preferences, system announcements, and expiration handling
- **Pagination & Filtering**: Efficient data retrieval with customizable limits and offsets
- **Authentication & Security**: JWT-based auth with bcrypt hashing, rate limiting, and CORS protection
- **Comprehensive Testing**: SQLite-based integration tests for zero production impact

## 🏗️ Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with Radix UI components
- **State Management**: TanStack Query for data fetching
- **Validation**: Zod for schema validation
- **UI Enhancements**: Framer Motion for animations, Recharts for data visualization

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (production), SQLite (testing)
- **Authentication**: JSON Web Tokens (JWT)
- **Security**: Helmet, express-rate-limit, CORS
- **Validation**: Joi for input sanitization
- **Scheduling**: node-cron for background tasks
- **ORM/Querying**: Direct SQL with pg library (consider adding an ORM like Prisma for larger scale)

### Testing
- **Framework**: Jest with ts-jest
- **Database**: SQLite for isolated, production-safe tests
- **Coverage**: Targets 85-90% for critical areas (data integrity, notifications, workspaces, pagination, audit trail)

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 13+ (for production)
- Git

### Clone and Install
```bash
git clone https://github.com/iamramakanthreddyk/mylab-platform.git
cd mylab-platform

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Environment Configuration
Create `.env` files in the `backend` directory:

**backend/.env**
```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/mylab_db
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=24h
```

**backend/.env.test** (for testing)
```
NODE_ENV=test
DATABASE_URL=sqlite::memory:  # Or a test file path
```

### Database Setup
```bash
cd backend
npm run db:setup  # Initializes PostgreSQL schema
npm run db:reset  # Resets and re-seeds (use with caution)
```

### Running the Application
```bash
# Start backend (in one terminal)
cd backend
npm run dev

# Start frontend (in another terminal)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) for the frontend and [http://localhost:3001](http://localhost:3001) for the API.

## 🛠️ Usage

### Development
- **Frontend**: `npm run dev` - Starts Vite dev server with hot reload
- **Backend**: `npm run dev` - Uses tsx for watch mode
- **Linting**: `npm run lint` (frontend) or `cd backend && npm run lint`
- **Building**: `npm run build` (frontend) or `cd backend && npm run build`

### Testing
```bash
cd backend
npm test                    # Run all integration tests
npm run test:integrity      # Data integrity & access control tests
npm run test:notifications  # Notifications & workspaces tests
npm run test:coverage       # With coverage report
npm run test:watch          # Watch mode for development
```

Tests use SQLite for isolation and include realistic fixtures with multiple workspaces, users, projects, samples, and analyses.

### API Overview
The backend exposes RESTful APIs under `/api/v1/`. Key endpoints:
- `GET/POST /workspaces` - Manage workspaces
- `GET/POST /projects` - Project CRUD
- `GET/POST /samples` - Sample management
- `GET/POST /batches` - Batch operations
- `GET/POST /analyses` - Analysis results with immutability
- `GET/POST /notifications` - User and system notifications
- `POST /auth/login` - Authentication

All endpoints require JWT authentication and respect workspace isolation. See backend source code for detailed schemas and error handling.

## 🤝 Contributing

We welcome contributions! To get started:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and add tests
4. Run tests: `cd backend && npm test`
5. Submit a pull request with a clear description

### Guidelines
- Follow TypeScript strict mode
- Write integration tests for new features
- Ensure workspace isolation in all queries
- Use descriptive commit messages
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues or questions:
- Check the [Issues](https://github.com/iamramakanthreddyk/mylab-platform/issues) page
- Review the backend test README for testing guidance
- File a new issue with logs and reproduction steps

---

**Last Updated**: February 5, 2026  
**Status**: ✅ Documentation Updated