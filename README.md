# Custom Contact Center 

A modern, serverless contact center application built with React, Node.js, and AWS services. This project demonstrates a full-stack, cloud-native architecture for managing customer interactions.

## 📋 Project Overview

This is an **end-to-end MVP** for a custom contact center platform that enables businesses to manage customer contacts, interactions, and communication channels efficiently.

### Key Features
- ✅ Contact management dashboard
- ✅ Serverless backend on AWS Lambda
- ✅ Real-time data with DynamoDB
- ✅ Local development with LocalStack emulation
- ✅ Clean Architecture with separation of concerns
- ✅ TypeScript for type safety across the stack
- 🔄 AWS Connect integration (placeholder for future expansion)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React + TS)                   │
│                    - Contact Management UI                      │
│                    - Dashboard & Analytics                      │
│                    - Tailwind CSS Styling                       │
└─────────────────┬───────────────────────────────────────────────┘
                  │ REST API / HTTP
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                 Backend (Node.js + Lambda + TS)                 │
│             - API Gateway → Lambda Functions                    │
│             - Business Logic & Services                         │
│             - Clean Architecture Layers                         │
└──────┬────────────────────────────┬─────────────────────────────┘
       │                            │
       ↓                            ↓
┌──────────────────┐        ┌───────────────────┐
│   DynamoDB       │        │  AWS Connect      │
│  - Contacts      │        │  (Future)         │
│  - Interactions  │        │  - Call Routing   │
│  - Queues        │        │  - IVR            │
└──────────────────┘        └───────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool & dev server
- **Zustand** - Lightweight state management
- **Material-UI** - Component library
- **ESLint** - Code quality

### Backend
- **Node.js 18+** - Runtime
- **TypeScript** - Type safety
- **AWS Lambda** - Serverless compute
- **AWS API Gateway** - REST endpoint
- **AWS DynamoDB** - NoSQL database
- **AWS IAM** - Access control
- **Serverless Framework** - Infrastructure as Code
- **serverless-offline** - Local development

### Local Development
- **LocalStack** - AWS services emulation
- **Docker & Docker Compose** - Containerization
- **AWS CLI** - AWS service interaction

### DevOps & Infrastructure
- **AWS SAM** / **CloudFormation** - Infrastructure templates
- **AWS CloudWatch** - Monitoring & logging
- **AWS Cognito** - (Future) Authentication

---

## 📁 Project Structure

```
project-aws-custom-contact-center/
├── frontend/                          # React TS app
│   ├── src/
│   │   ├── /assets
│   │   ├── /components
│   │   ├── /pages
│   │   ├── /services
│   │   ├── /store
│   │   ├── /types
│   │   ├── /utils
│   │   └── main.tsx               
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── .env.local                    # Frontend environment variables
│
├── backend/                           # Node.js Lambda functions
│   ├── src/
│   │   ├── /                
│   │   ├── /             
│   │   ├── /                           
│   │   ├── /               
│   │   └── utils/                    # Utilities
│   ├── serverless.yml                # Serverless framework config
│   ├── template.yaml                 # SAM template (IaC)
│   ├── package.json
│   └── .env                          # Backend environment variables
│
├── infrastructure/                    # IaC configurations
│   ├── sam/                          # SAM templates
│   ├── cloudformation/               # CloudFormation templates
│   └── scripts/                      # Deployment scripts
│
├── localstack/                        # LocalStack setup
│   ├── init-aws.sh                   # AWS resource initialization
│   └── config/                       # LocalStack configuration
│
├── shared/                           # Shared types/utilities
│   ├── types/                        # Shared TypeScript interfaces
│   └── constants/                    # Shared constants
│
├── scripts/                          # Development & deployment scripts
│   ├── setup.sh                      # Initial setup
│   ├── start-local.sh                # Start local development
│   └── deploy.sh                     # Deploy to AWS
│
├── docker-compose.yml                # Local environment orchestration
├── LOCALSTACK.md                     # LocalStack setup guide
├── ARCHITECTURE.md                   # Architecture documentation
├── .env                              # Root environment config
└── README.md                         # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- npm or yarn
- AWS CLI (optional)

### 1. Clone & Install

```bash
git clone <repo-url>
cd project-aws-custom-contact-center

# Install dependencies
npm install --workspaces
```

### 2. Start Local Environment

```bash
# Start LocalStack, Backend, and Frontend with Docker Compose
docker-compose up -d

# Or start manually:
npm run dev:frontend
npm run dev:backend
npm run dev:localstack
```

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **LocalStack**: http://localhost:4566

### 4. Verify Setup

```bash
# Check LocalStack health
curl http://localhost:4566/_localstack/health

# Check Backend
curl http://localhost:3001/health

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## 📖 Documentation

- **[LOCALSTACK.md](./LOCALSTACK.md)** - LocalStack setup & AWS service emulation
- **[ARCHITECTURE.md](./frontend/ARCHITECTURE.md)** - Frontend Clean Architecture
- **[Backend README](./backend/README.md)** - Backend setup & API documentation (TODO)

---

## 🔐 Environment Configuration

### Root `.env`
```env
LOCALSTACK_ENDPOINT=http://localhost:4566
AWS_REGION=us-east-1
ENVIRONMENT=development
```

### Frontend `.env.local`
```env
VITE_API_URL=http://localhost:3001/api
VITE_AWS_ENDPOINT=http://localhost:4566
```

### Backend `.env`
```env
LOCALSTACK_ENDPOINT=http://localhost:4566
DYNAMODB_TABLE_NAME=contacts
SQS_QUEUE_URL=http://localhost:4566/000000000000/contact-queue
```

See `.env` files in respective directories for all available options.

---

## 🗄️ Database Schema

### DynamoDB Tables

#### `contacts` Table
- **PK**: `id` (String)
- **Attributes**:
  - `name` (String)
  - `email` (String)
  - `phone` (String)
  - `status` (String) - active, inactive, archived
  - `createdAt` (Number) - Unix timestamp
  - `updatedAt` (Number) - Unix timestamp

#### `interactions` Table (Future)
- **PK**: `id` (String)
- **SK**: `contactId` (String)
- **Attributes**:
  - `type` (String) - call, email, chat
  - `duration` (Number)
  - `notes` (String)
  - `timestamp` (Number)

#### `queues` Table (Future)
- **PK**: `id` (String)
- **Attributes**:
  - `name` (String)
  - `agentCount` (Number)
  - `averageWaitTime` (Number)

---

## 🔌 API Endpoints

### Contacts API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/contacts` | List all contacts |
| `GET` | `/api/contacts/:id` | Get contact by ID |
| `POST` | `/api/contacts` | Create new contact |
| `PUT` | `/api/contacts/:id` | Update contact |
| `DELETE` | `/api/contacts/:id` | Delete contact |

### Example Request

```bash
curl -X POST http://localhost:3001/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123"
  }'
```

---

## 🔄 AWS Connect Integration (Placeholder)

### Future Features
- [ ] Integration with AWS Connect for voice/chat
- [ ] IVR (Interactive Voice Response) configuration
- [ ] Call routing based on contact attributes
- [ ] Call recording and transcription
- [ ] Real-time agent status synchronization
- [ ] Contact center metrics & reporting

### Architecture
```
AWS Connect
    ↓
Lambda Trigger
    ↓
DynamoDB Updates
    ↓
Frontend Real-time Updates (WebSocket)
```

---

## 📊 Development Workflow

### Frontend Development
```bash
cd frontend
npm run dev          # Start dev server on :5173
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Lint code
```

### Backend Development
```bash
cd backend
npm run dev          # Start serverless-offline on :3001
npm run build        # Build Lambda functions
npm run test         # Run tests
npm run sls:deploy   # Deploy to AWS
```

### Local Testing
```bash
# Test API with curl
curl http://localhost:3001/api/contacts

# Test with AWS CLI (against LocalStack)
aws dynamodb scan --table-name contacts --endpoint-url http://localhost:4566

# View Lambda logs
sam logs --stack-name contact-center --tail
```

---

## 🧪 Testing

### Unit Tests
```bash
cd frontend && npm test
cd backend && npm test
```

### Integration Tests
```bash
# Start LocalStack
docker-compose up -d localstack

# Run integration tests
cd backend && npm run test:integration
```

### E2E Tests (Future)
```bash
# Start full stack
docker-compose up -d

# Run Cypress tests
npm run test:e2e
```

---

## 📦 Deployment

### To AWS

```bash
# Build and deploy backend
cd backend
npm run build
npm run sls:deploy -- --stage production

# Deploy frontend to S3 + CloudFront
cd frontend
npm run build
npm run deploy:aws
```

### Using SAM CLI

```bash
sam build
sam deploy --guided
```

---

## 🐛 Troubleshooting

### LocalStack Not Starting
```bash
docker-compose logs localstack
docker-compose down -v
docker-compose up -d
```

### Backend Can't Connect to LocalStack
- Check `LOCALSTACK_ENDPOINT=http://localhost:4566` in `.env`
- Verify LocalStack is running: `curl http://localhost:4566/_localstack/health`

### Port Conflicts
Edit `docker-compose.yml` and change ports if 4566, 3001, or 5173 are in use.

### Database Connection Issues
```bash
# Verify DynamoDB table exists
aws dynamodb list-tables --endpoint-url http://localhost:4566

# Re-initialize
docker-compose down -v
docker-compose up -d
```

See [LOCALSTACK.md](./LOCALSTACK.md) for more details.

---

## 🔐 Security Best Practices

- ✅ Never commit `.env` files (use `.env.example`)
- ✅ Use IAM roles for AWS service authentication in production
- ✅ Enable encryption for DynamoDB tables
- ✅ Use VPC endpoints for Lambda to database connections
- ✅ Implement API Gateway request validation
- ✅ Enable CloudTrail for audit logging
- ✅ Use AWS Secrets Manager for sensitive data
- ✅ Enable CORS only for trusted domains

---

## 📈 Performance & Scaling

### Frontend Optimization
- Code splitting with Vite
- Tree-shaking unused code
- Image optimization
- Lazy loading routes

### Backend Optimization
- Lambda concurrent execution limits
- DynamoDB on-demand billing
- API Gateway caching
- CloudFront CDN for static assets

### Monitoring
- CloudWatch metrics for Lambda
- X-Ray for distributed tracing
- Custom metrics for application events

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Open a Pull Request

### Code Standards
- Use TypeScript for type safety
- Follow ESLint configuration
- Write meaningful commit messages
- Add tests for new features

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

---

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation (ARCHITECTURE.md, LOCALSTACK.md)
- Review the troubleshooting section

---

## 🚀 Next Steps

- [ ] Implement AWS Connect integration
- [ ] Add authentication with AWS Cognito
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add comprehensive unit & E2E tests
- [ ] Implement real-time updates with WebSockets
- [ ] Add monitoring with CloudWatch & X-Ray
- [ ] Deploy to production AWS environment
- [ ] Set up automated backups for DynamoDB

---

**Last Updated**: April 3, 2026

For the latest updates and documentation, refer to the individual README files in each directory.