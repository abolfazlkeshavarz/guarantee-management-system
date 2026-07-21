# Guarantee Management System

An enterprise-level Guarantee (Warranty) Management System built with Go, React, and PostgreSQL.

## Features

- **Authentication**: JWT-based authentication with role-based access control
- **Admin Dashboard**: Complete overview of system metrics
- **Guarantee Management**: Create, approve, reject, renew, and cancel guarantees
- **Technician Management**: Manage technicians and their assignments
- **Customer Management**: Track customer information and guarantee history
- **Product Management**: Manage product categories and products
- **Repair Management**: Track repairs and repair reports
- **Part Management**: Manage parts and part requests
- **Search**: Global search across all entities
- **File Upload**: Support for invoices, guarantee cards, and repair images

## Tech Stack

### Backend
- Go 1.24+
- Gin Framework
- GORM ORM
- PostgreSQL
- JWT Authentication
- Clean Architecture
- Repository Pattern

### Frontend
- React 19
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui
- React Router
- TanStack Query
- React Hook Form
- Zod

### Deployment
- Docker
- Docker Compose
- Nginx

## Prerequisites

- Go 1.24+
- Node.js 20+
- PostgreSQL 16+
- Docker (optional)

## Installation

### Using Docker

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd guarantee-management-system