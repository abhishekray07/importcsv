---
sidebar_position: 1
---

# Introduction

Welcome to the **ImportCSV** documentation. ImportCSV is a comprehensive solution for importing CSV and spreadsheet data into web applications.

## Overview

ImportCSV helps users import CSV and spreadsheet data into web applications. It provides a React frontend for file uploads and column mapping, with a FastAPI backend for processing and storage.

> **Note**: The CSV Importer component was forked from [TableFlow's CSV Import](https://github.com/tableflowhq/csv-import) and enhanced with additional features.

## Key Features

- **Column Mapping** - Match source columns to destination fields
- **Multiple File Formats** - Support for CSV, XLS, XLSX, and TSV files
- **Background Processing** - Redis Queue for handling large imports
- **Authentication** - JWT-based auth with token refresh
- **Embeddable Components** - React components for easy integration
- **Data Validation** - Client-side validation with feedback
- **Webhooks** - Integration points for custom workflows

## Architecture

The project has three main components:

- **Backend** - FastAPI server with Redis Queue for background processing
- **Frontend** - React SDK for file uploads and column mapping
- **Admin** - Next.js dashboard for managing imports

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, Redis Queue
- **Frontend**: TypeScript, React, Tailwind CSS
- **Admin**: Next.js, TypeScript, Shadcn
- **Deployment**: Docker & Docker Compose

## Next Steps

To get started with ImportCSV, check out the [Quick Start Guide](getting-started/quick-start) or follow the [Installation Instructions](getting-started/installation) to set up the project.
